import { Status } from '@ipfs-shipyard/pinning-service-client';
import { logger } from '@libp2p/logger';
import { multiaddr } from '@multiformats/multiaddr';
import pRetry, {} from 'p-retry';
const log = logger('helia:remote-pinning');
export class HeliaRemotePinner {
    heliaInstance;
    remotePinningClient;
    config;
    constructor(heliaInstance, remotePinningClient, config) {
        this.heliaInstance = heliaInstance;
        this.remotePinningClient = remotePinningClient;
        this.config = {
            ...config,
            mergeOrigins: config?.mergeOrigins ?? false,
            retryOptions: {
                retries: 10,
                ...config?.retryOptions
            }
        };
    }
    /**
     * This method is used to get the origins that the pinning provider can use to retrieve the content.
     * If passed origins, it will use those origins. Otherwise, it will use the libp2p multiaddrs.
     * If mergeOrigins is true, it will merge the origins from the libp2p node with the provided origins.
     *
     * @param providedOrigins - provided origins
     * @returns
     */
    getOrigins(providedOrigins = []) {
        if (providedOrigins.length > 0 && !this.config.mergeOrigins) {
            return providedOrigins;
        }
        const multiaddrs = this.heliaInstance.libp2p.getMultiaddrs();
        const origins = new Set([...providedOrigins, ...multiaddrs]);
        return [...origins];
    }
    async connectToDelegates(delegates, signal) {
        try {
            const filteredDelegates = this.config.filterDelegates?.([...delegates]) ?? [...delegates];
            await Promise.any(filteredDelegates.map(async (delegate) => {
                try {
                    await this.heliaInstance.libp2p.dial(multiaddr(delegate), { signal });
                }
                catch (e) {
                    log.error('Failed to connect to delegate %s', delegate, e);
                    throw e;
                }
            }));
        }
        catch (e) {
            log.error('Failed to connect to any delegates', e);
        }
    }
    /**
     * The code that runs after we get a pinStatus from the remote pinning service.
     * This method is the orchestrator for waiting for the pin to complete/fail as well as connecting to the delegates.
     */
    async handlePinStatus(pinStatus, signal) {
        await this.connectToDelegates(pinStatus.delegates, signal);
        let updatedPinStatus = pinStatus;
        /**
         * We need to ensure that pinStatus is either pinned or failed.
         * To do so, we will need to poll the remote pinning service for the status of the pin.
         */
        try {
            await pRetry(async (attemptNum) => {
                updatedPinStatus = await this.remotePinningClient.pinsRequestidGet({ requestid: pinStatus.requestid });
                log.trace('attempt #%d pinStatus: %s', attemptNum, updatedPinStatus.status);
                if ([Status.Pinned, Status.Failed].includes(pinStatus.status)) {
                    return updatedPinStatus;
                }
                throw new Error(`Pin status is ${pinStatus.status}`);
            }, {
                signal,
                ...this.config?.retryOptions
            });
        }
        catch (e) {
            log.error(e);
        }
        log.trace('final pinStatus: %s', updatedPinStatus.status);
        return updatedPinStatus;
    }
    #getPinArg({ cid, ...otherArgs }) {
        const origins = this.getOrigins(otherArgs.origins);
        const filteredOrigins = this.config.filterOrigins?.(origins) ?? origins;
        return {
            ...otherArgs,
            cid: cid.toString(),
            // @ts-expect-error - broken types: origins needs to be an array of strings
            origins: filteredOrigins.length > 0 ? filteredOrigins.map(ma => ma.toString()) : undefined
        };
    }
    async addPin({ cid, signal, ...otherArgs }) {
        signal?.throwIfAborted();
        const pinStatus = await this.remotePinningClient.pinsPost({
            pin: this.#getPinArg({ cid, ...otherArgs })
        }, {
            signal
        });
        log.trace('Initial pinsPost made, status: %s', pinStatus.status);
        return this.handlePinStatus(pinStatus, signal);
    }
    async replacePin({ cid, requestid, signal, ...otherArgs }) {
        signal?.throwIfAborted();
        const pinStatus = await this.remotePinningClient.pinsRequestidPost({
            requestid,
            pin: this.#getPinArg({ cid, ...otherArgs })
        }, {
            signal
        });
        log.trace('Initial pinReplace made, status: %s', pinStatus.status);
        return this.handlePinStatus(pinStatus, signal);
    }
}
//# sourceMappingURL=heliaRemotePinner.js.map
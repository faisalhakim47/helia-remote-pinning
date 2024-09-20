import { type RemotePinningServiceClient, type Pin, type PinStatus, type PinsRequestidPostRequest } from '@ipfs-shipyard/pinning-service-client';
import { type Multiaddr } from '@multiformats/multiaddr';
import { type Options as pRetryOptions } from 'p-retry';
import type { Helia } from 'helia';
import type { CID } from 'multiformats/cid';
interface HeliaRemotePinningMethodOptions {
    /**
     * Control whether requests are aborted or not by manually aborting a signal or using AbortSignal.timeout()
     */
    signal?: AbortSignal;
    /**
     * The CID instance to pin. When using Helia, passing around the CID object is preferred over the string.
     */
    cid: CID;
    /**
     * The multiaddrs that the pinning provider can use to retrieve the content.
     */
    origins?: Multiaddr[];
}
export interface AddPinArgs extends Omit<Pin, 'cid' | 'origins'>, HeliaRemotePinningMethodOptions {
}
export interface ReplacePinArgs extends Omit<PinsRequestidPostRequest, 'pin'>, Omit<Pin, 'cid' | 'origins'>, HeliaRemotePinningMethodOptions {
}
export interface HeliaRemotePinnerConfig {
    /**
     * pRetry options when waiting for pinning to complete/fail in {@link handlePinStatus}
     *
     * @default { retries: 10 }
     */
    retryOptions?: pRetryOptions;
    /**
     * Whether to merge the origins from the libp2p node with the provided origins.
     * If false, it will only use the provided origins.
     * If false and no origins are provided, it will use the libp2p node's multiaddrs.
     * If true and no origins are provided, it will use the libp2p node's multiaddrs.
     * If true and origins are provided, it will merge the libp2p node's multiaddrs and the provided origins.
     *
     * @default false
     */
    mergeOrigins?: boolean;
    /**
     * A function to filter the origins that the pinning provider can use to retrieve the content.
     * You can use this to filter out multiaddrs that aren't dialable by the pinning provider.
     * This method will only filter out the origins obtained from the libp2p node, not the provided origins.
     * For example, if you are using a remote pinning service that only supports TCP, you can filter out the multiaddrs that use UDP.
     *
     * @default (origins) => origins
     */
    filterOrigins?(origins: Multiaddr[]): Multiaddr[];
    /**
     * A function to filter the delegates that the pinning provider expects us to connect to, before we connect to them.
     *
     * @default (delegates) => delegates
     */
    filterDelegates?(delegates: string[]): string[];
}
export declare class HeliaRemotePinner {
    #private;
    private readonly heliaInstance;
    private readonly remotePinningClient;
    private readonly config;
    constructor(heliaInstance: Helia, remotePinningClient: RemotePinningServiceClient, config?: HeliaRemotePinnerConfig);
    /**
     * This method is used to get the origins that the pinning provider can use to retrieve the content.
     * If passed origins, it will use those origins. Otherwise, it will use the libp2p multiaddrs.
     * If mergeOrigins is true, it will merge the origins from the libp2p node with the provided origins.
     *
     * @param providedOrigins - provided origins
     * @returns
     */
    private getOrigins;
    private connectToDelegates;
    /**
     * The code that runs after we get a pinStatus from the remote pinning service.
     * This method is the orchestrator for waiting for the pin to complete/fail as well as connecting to the delegates.
     */
    private handlePinStatus;
    addPin({ cid, signal, ...otherArgs }: AddPinArgs): Promise<PinStatus>;
    replacePin({ cid, requestid, signal, ...otherArgs }: ReplacePinArgs): Promise<PinStatus>;
}
export {};
//# sourceMappingURL=heliaRemotePinner.d.ts.map
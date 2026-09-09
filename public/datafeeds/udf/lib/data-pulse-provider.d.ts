import { LibrarySymbolInfo, ResolutionString, SubscribeBarsCallback } from '../../../charting_library/datafeed-api';
import { IDataPulseProvider, IHistoryProvider } from './provider-interfaces';
export declare class DataPulseProvider implements IDataPulseProvider {
    private readonly _subscribers;
    private _requestsPending;
    private readonly _historyProvider;
    private readonly _updateFrequency;
    private _updateTimer;
    constructor(historyProvider: IHistoryProvider, updateFrequency: number);
    subscribeBars(symbolInfo: LibrarySymbolInfo, resolution: ResolutionString, newDataCallback: SubscribeBarsCallback, listenerGuid: string): void;
    unsubscribeBars(listenerGuid: string): void;
    private _createTimerIfRequired;
    private _destroyTimer;
    private _updateData;
    private _updateDataForSubscriber;
    private _onSubscriberDataReceived;
}

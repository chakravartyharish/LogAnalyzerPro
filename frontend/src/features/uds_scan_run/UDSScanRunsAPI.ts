import { dcrfClient } from '../../app/api'
import { logger } from '../../app/logging';
import {
    IUDSScanRun,
    ICreateUDSScanRun
} from './UDSScanRunsSlice';

const wsStream = 'udsscanrun'

export const fetchAllUDSScanRunsViaDCRF = () => {
    logger.debug('fetchAllUDSScanRunsViaDCRF')
    return dcrfClient.list(wsStream)
}

export const patchUDSScanRunViaDCRF = (id: number, data: any) => {
    logger.debug(`patchUDSScanRunViaDCRF with id: ${id} - data: ${data}`)
    return dcrfClient.patch(wsStream, id, data)
}

export const createUDSScanRunViaDCRF = (newScanRun: ICreateUDSScanRun) => {
    logger.debug(`createUDSScanRunViaDCRF with hw_interface: ${newScanRun.hw_interface}`)
    return dcrfClient.create(wsStream, newScanRun)
}

export const deleteUDSScanRunViaDCRF = (id: number) => {
    logger.debug(`deleteUDSScanRunViaDCRF with id: ${id}`)
    return dcrfClient.delete(wsStream, id)
}

export const subscribeToUDSScanRunChangesViaDCRF = (callback: (scanRun: IUDSScanRun | undefined, action: string) => void) => {
    logger.debug('subscribeToUDSScanRunChangesViaDCRF')

    // NOTE: also subscribe to the scan run findings here because although a scan run holds a list of findings
    //       any change to a finding (or adding one) will not send a notification for the associated scan run
    //       (the backend handles this now, keep this as "documentation" until it is clear that the backend change does not break anything)
    //dcrfClient.subscribe('udsscanrunfinding',
    //    {},
    //    (scanRunFinding, action) => {
    //        // we do not care about the data, just re-fetch all scan runs
    //        callback(undefined, 'force-refetch')
    //    },
    //    {
    //        includeCreateEvents: true,
    //        subscribeAction: 'subscribe_to_all_changes',
    //        unsubscribeAction: 'unsubscribe_from_all_changes',
    //    }
    //)

    const subscription = dcrfClient.subscribe(wsStream,
        {},
        (scanRun, action) => {
            callback(scanRun as IUDSScanRun, action)
        },
        {
            includeCreateEvents: true,
            requestId: 'subscribeToUDSScanRunChangesViaDCRF',
            subscribeAction: 'subscribe_to_all_changes',
            unsubscribeAction: 'unsubscribe_from_all_changes',
        }
    )
    // a subscription can be canceled by calling "cancel" on the returned subscription object
    return subscription
}
import { dcrfClient } from "../../app/api";
import { logger } from "../../app/logging";
import { IBackendBackendEvent } from "./BackendEventSlice";

/*
export const fetchAllBackendEventsViaREST = () => {
    logger.debug('fetchAllBackendEventsViaREST')
    return restClient.get('/user_messages/')
}
*/

export const fetchAllBackendEventsViaDCRF = () => {
    logger.debug('fetchAllBackendEventsViaDCRF')
    return dcrfClient.list('backendevent')
}

export const patchBackendEventViaDCRF = (id: number, data: any) => {
    logger.debug(`patchBackendEventViaDCRF with id: ${id} - data: ${data}`)
    return dcrfClient.patch("backendevent", id, data)
}

export const subscribeToBackendEventChangesViaDCRF = (callback: (backendEvent: IBackendBackendEvent, action: string) => void) => {
    logger.debug("subscribeToBackendEventChangesViaDCRF")
    const subscription = dcrfClient.subscribe('backendevent',
        {},
        (backendEvent, action) => {
            callback(backendEvent as IBackendBackendEvent, action)
        },
        {
            includeCreateEvents: true,
            requestId: 'subscribeToBackendEventChangesViaDCRF',
            subscribeAction: 'subscribe_to_all_changes',
            unsubscribeAction: 'unsubscribe_from_all_changes',
        }
    )
    // a subscription can be canceled by calling "cancel" on the returned subscription object
    return subscription
}
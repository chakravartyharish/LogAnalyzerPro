import { dcrfClient } from "../../app/api";
import { logger } from "../../app/logging";
import { IBackendUserMessage } from "../user_message/UserMessageSlice";

/*
export const fetchAllUserMessagesViaREST = () => {
    logger.debug('fetchAllUserMessagesViaREST')
    return restClient.get('/user_messages/')
}
*/

export const fetchAllUserMessagesViaDCRF = () => {
    logger.debug('fetchAllUserMessagesViaDCRF')
    return dcrfClient.list('usermessage')
}

export const patchUserMessageViaDCRF = (id: number, data: any) => {
    logger.debug(`patchUserMessageViaDCRF with id: ${id} - data: ${data}`)
    return dcrfClient.patch("usermessage", id, data)
}

export const subscribeToUserMessageChangesViaDCRF = (callback: (userMessage: IBackendUserMessage, action: string) => void) => {
    logger.debug("subscribeToUserMessageChangesViaDCRF")
    const subscription = dcrfClient.subscribe('usermessage',
        {},
        (userMessage, action) => {
            callback(userMessage as IBackendUserMessage, action)
        },
        {
            includeCreateEvents: true,
            requestId: 'subscribeToUserMessageChangesViaDCRF',
            subscribeAction: 'subscribe_to_all_changes',
            unsubscribeAction: 'unsubscribe_from_all_changes',
        }
    )
    // a subscription can be canceled by calling "cancel" on the returned subscription object
    return subscription
}
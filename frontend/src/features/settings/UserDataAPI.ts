import { dcrfClient } from "../../app/api";
import { logger } from "../../app/logging";
import { IUserData } from "./UserDataSlice";

const wsStream = 'userdata'

export const fetchUserDataViaDCRF = () => {
    logger.debug('fetchUserDataViaDCRF')
    return dcrfClient.list(wsStream)
}

export const patchUserDataViaDCRF = (id: number, data: any) => {
    logger.debug(`patchUserDataViaDCRF with data: ${data}`)
    return dcrfClient.patch(wsStream, id, data)
}

export const subscribeToUserDataChangesViaDCRF = (callback: (userData: IUserData, action: string) => void) => {
    logger.debug("subscribeToUserDataChangesViaDCRF")
    const subscription = dcrfClient.subscribe(wsStream,
        {},
        (userData, action) => {
            callback(userData as IUserData, action)
        },
        {
            includeCreateEvents: true,
            requestId: 'subscribeToUserDataChangesViaDCRF',
            subscribeAction: 'subscribe_to_all_changes',
            unsubscribeAction: 'unsubscribe_from_all_changes',
        }
    )
    // a subscription can be canceled by calling "cancel" on the returned subscription object
    return subscription
}

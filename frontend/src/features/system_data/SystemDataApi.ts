import { dcrfClient } from "../../app/api"
import { logger } from "../../app/logging"

const wsStream = 'systemdata'

export const fetchSystemDataViaDCRF = () => {
    logger.debug('fetchSystemDataViaDCRF')
    return dcrfClient.list(wsStream)
}
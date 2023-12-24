import { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import {
    selectUserMessages,
    setUserMessageStateAsync,
    IBackendUserMessage
} from './UserMessageSlice';

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { useTranslation } from "react-i18next";

import "./UserMessage.css"
import { addOrActivateLicensesWidget } from "../main_lumino_widget/MainLuminoWidgetSlice";
import { ConditionalFragment } from "../misc/Util";

export const UserMessage = () => {
    const userMessages = useAppSelector(selectUserMessages)
    // const lastRequestStatus = useAppSelector(selectLastRequestStatus)
    const [shownMessage, setShownMessage] = useState<IBackendUserMessage | undefined>(undefined)

    const { t } = useTranslation()

    const dispatch = useAppDispatch()

    // Note: userMessages which are in the state PRESENTED and which are not acknowledged will not 
    // be shown again after a logout. They will forever keep the PRESENTED state
    useEffect( () => {
        const createdUserMessages = userMessages.filter( userMessage => userMessage.state === 'CREATED' )
        if (createdUserMessages.length === 0 || shownMessage !== undefined) {
            return
        }
        // pick the oldest message first
        const userMessageToShow = createdUserMessages.sort( (a, b) => (a.created_at > b.created_at) ? 1 : -1 ).pop()!
        dispatch(setUserMessageStateAsync({id: userMessageToShow.id, state: 'PRESENTED'}))
        setShownMessage(userMessageToShow)
    }, [userMessages, shownMessage, dispatch])

    const handleClose = () => {
        if (shownMessage === undefined) {
            return
        }
        dispatch(setUserMessageStateAsync({id: shownMessage.id!, state: 'ACKNOWLEDGED'}))
        setShownMessage(undefined)
    }

    const handleCloseAndOpenLicenses = () => {
        handleClose()
        dispatch(addOrActivateLicensesWidget())
    }

    return (
        <Dialog
            open={shownMessage !== undefined}
            onClose={handleClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">
                {shownMessage?.title}
            </DialogTitle>
            <DialogContent>
                <DialogContentText id="alert-dialog-description">
                    {shownMessage?.message}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <ConditionalFragment condition={shownMessage?.title === t("Professional Version Feature")}>
                    <Button onClick={handleCloseAndOpenLicenses}>
                        {t("Licenses View")}
                    </Button>
                </ConditionalFragment>
                <Button onClick={handleClose} autoFocus>
                    {t("Ok")}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
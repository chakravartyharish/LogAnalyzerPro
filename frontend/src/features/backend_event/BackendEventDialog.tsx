import { useAppSelector, useAppDispatch } from '../../app/hooks';
import {
    selectBackendEvent,
    selectDisplayedBackendEventId,
    showBackendEvent
} from './BackendEventSlice';

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { useTranslation } from "react-i18next";
import { useMemo } from 'react';
import { logger } from '../../app/logging';

import "./BackendEvent.css"

export const BackendEventDialog = () => {
    const dispatch = useAppDispatch()
    const displayedBackendEventId = useAppSelector(selectDisplayedBackendEventId)
    const backendEvent = useAppSelector(selectBackendEvent(displayedBackendEventId!))

    const { t } = useTranslation()

    const handleClose = () => {
        if (backendEvent === undefined) {
            return
        }
        dispatch(showBackendEvent(undefined))
    }

    const renderedTemplate = useMemo(() => {
        if (!backendEvent) {
            return ''
        }
        let extras: any = backendEvent.extras
        if (typeof(extras) !== 'object') {
            logger.debug("Extras should be an object!")
            return
        }
        switch (backendEvent.type) {
            default:
                return (
                    <DialogContentText>
                        {backendEvent.template}
                    </DialogContentText>
                )
        }
    }, [backendEvent])

    return (
        <Dialog
            open={backendEvent !== undefined}
            onClose={handleClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">
                {backendEvent?.level}
            </DialogTitle>
            <DialogContent>
                {renderedTemplate}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} autoFocus>
                    {t("Ok")}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
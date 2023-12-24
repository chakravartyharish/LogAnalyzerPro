import { useMemo, useState, useEffect } from "react"
import Button from "@mui/material/Button/Button"
import IconButton from "@mui/material/IconButton"
import { Container } from "@mui/system"
import { useAppDispatch, useAppSelector } from "../../app/hooks"
import { changeLocale, selectSettings, setDarkTheme, setLightTheme, toggleNavigationTree } from "./SettingsSlice"
import Brightness3Icon from '@mui/icons-material/Brightness3';
import LightModeIcon from '@mui/icons-material/LightMode';
import SwitchLeftIcon from '@mui/icons-material/SwitchLeft';
import SwitchRightIcon from '@mui/icons-material/SwitchRight';
import PestControlIcon from '@mui/icons-material/PestControl';
import DialogTitle from "@mui/material/DialogTitle"
import Dialog from "@mui/material/Dialog"
import DialogContentText from "@mui/material/DialogContentText"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import { useTranslation } from "react-i18next"
import { MenuItem, Menu, Link } from "@mui/material"
import LanguageIcon from '@mui/icons-material/Language'
import LogoutIcon from '@mui/icons-material/Logout'
import { selectUserDataAsObject, updateUserDataObjectAsync } from "./UserDataSlice"
import { userDataDarkThemeEnabled, userDataSelectedLocale } from "../misc/Constants"
import { ConditionalFragment, isRunningAs, showUseAtYourOwnRiskDisclaimer } from "../misc/Util"

// NOTE: these are the settings that are shown left beside the navigation tree

export const SidePannelSettings = () => {
    // const [bugReportText, setBugReportText] = useState('')
    const [open, setOpen] = useState(false)
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const languageOpen = Boolean(anchorEl)
    
    const settings = useAppSelector(selectSettings)
    const userDataObject = useAppSelector(selectUserDataAsObject)
    const [shouldShowDisclaimer, setShouldShowDisclaimer] = useState(false)
    // const licenses = useAppSelector(selectLicenses)
    
    const { t, i18n } = useTranslation()
    
    const dispatch = useAppDispatch()

    const toggleNavigationTreeHelper = () => {
        dispatch(toggleNavigationTree())
    }

    const toggleTheme = () => {
        if (userDataObject === undefined) {
            return
        }
        let updatedUserDataObject = Object.assign({}, userDataObject)
        updatedUserDataObject[userDataDarkThemeEnabled] = !(userDataObject[userDataDarkThemeEnabled] ?? false)
        dispatch(updateUserDataObjectAsync(updatedUserDataObject))
    }

    const handleLanguageClick = (event: React.MouseEvent<HTMLElement>) => {
        const locale = event.currentTarget.dataset.value
        if (userDataObject === undefined || locale === undefined) {
            return
        }
        let updatedUserDataObject = Object.assign({}, userDataObject)
        updatedUserDataObject[userDataSelectedLocale] = locale
        dispatch(updateUserDataObjectAsync(updatedUserDataObject))
    }

    useEffect(() => {
        if (userDataObject === undefined) {
            return
        }

        // dark theme
        let darkThemeEnabled = userDataObject[userDataDarkThemeEnabled] ?? false
        dispatch(darkThemeEnabled ? setDarkTheme() : setLightTheme())

        // locale
        let selectedLocale = userDataObject[userDataSelectedLocale] ?? "en"
        i18n.changeLanguage(selectedLocale)
        dispatch(changeLocale(selectedLocale))

        // TODO: move the disclaimer stuff to some other location
        //       (should not be in "settings")
        if (isRunningAs("HydraScope")) {
            if (!shouldShowDisclaimer) {
                setShouldShowDisclaimer(true)
            }
        }
    }, [userDataObject, i18n, shouldShowDisclaimer, dispatch])

    useEffect(() => {
        if (!isRunningAs("HydraScope")) {
            return
        }
        /*
        // disable the disclaimer for this use case
        if (shouldShowDisclaimer) {
            showUseAtYourOwnRiskDisclaimer()
        }
        */
    }, [shouldShowDisclaimer])

    const darkThemeEnabled = useMemo(() => (userDataObject ?? {})[userDataDarkThemeEnabled] ?? false, [userDataObject])

    // const sendBugReport = () => {
    //     const bugReportPacket: IBugReportPacket = {
    //         licenses: licenses,
    //         bugReportText: bugReportText
    //     }
    //     dispatch(sendBugReportAsync(bugReportPacket))
    //     handleBugReportClose()
    // }

    const handleBugReportOpen = () => {
        setOpen(true)
    }
    const handleBugReportClose = () => {
        setOpen(false)
    }

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget)
    }
    const handleClose = () => {
      setAnchorEl(null)
    }

    // const hasAllNeededData = () => {
    //     return bugReportText.length > 0
    // }

    return (
        <Container sx={{ml: -3}}>
            <IconButton sx={{ }} onClick={toggleNavigationTreeHelper} color="inherit">
                {settings.isExpandedNavTree ? <SwitchLeftIcon /> : <SwitchRightIcon />}
            </IconButton>
            <br/>
            <IconButton sx={{ }} onClick={toggleTheme} color="inherit">
                {darkThemeEnabled ? <LightModeIcon /> : <Brightness3Icon />}
            </IconButton>
            <IconButton sx={{ }} onClick={handleBugReportOpen} color="inherit">
                <PestControlIcon/>
            </IconButton>
            <Dialog open={open} onClose={handleBugReportClose}>
                <DialogTitle>{t("Bug Report")}</DialogTitle>
                <DialogContent>
                    {/* <DialogContentText>
                        {t("Please describe the bug you encountered and how to reproduce the behaviour")}:
                    </DialogContentText>
                    <br/>
                    <TextField
                        autoFocus
                        id="bug-report-text"
                        label={t("Bug Report Descripton")}
                        fullWidth
                        multiline
                        minRows={8}
                        value={bugReportText}
                        onChange={(e) => setBugReportText(e.target.value)}
                    /> */}
                    <DialogContentText>
                        {t("Please describe the bug you encountered and how to reproduce the behaviour on our support website by filling in a bug report")}:
                    </DialogContentText>
                    <Link target="_blank" href='https://support.dissecto.com/help/101297368' rel="noreferrer">support.dissec.to/help</Link>
                    <DialogContentText>
                        {t("You can also visit our knowledge base to find solutions for your problem")}:
                    </DialogContentText>
                    <Link target="_blank" href='https://support.dissecto.com/hc/101297368' rel="noreferrer">support.dissec.to/hc</Link>
                </DialogContent>
                <DialogActions>
                    {/* <Button onClick={handleBugReportClose}>{t("Cancel")}</Button> */}
                    {/* <Button onClick={sendBugReport} disabled={!hasAllNeededData()}>{t("Send")}</Button> */}
                    <Button onClick={handleBugReportClose}>{t("OK")}</Button>
                </DialogActions>
            </Dialog>
            <IconButton
                id="language-button"
                aria-controls={open ? 'language-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                onClick={handleClick}
                color="inherit"
            >
                <LanguageIcon/>
            </IconButton>
            <Menu
                id="language-menu"
                anchorEl={anchorEl}
                open={languageOpen}
                onClick={handleClose}
                onClose={handleClose}
                MenuListProps={{
                'aria-labelledby': 'language-button',
                }}
            >
                <MenuItem data-value="en" onClick={handleLanguageClick}><em>en</em></MenuItem>
                <MenuItem data-value="de" onClick={handleLanguageClick}><em>de</em></MenuItem>
            </Menu>
        </Container>
    )
}
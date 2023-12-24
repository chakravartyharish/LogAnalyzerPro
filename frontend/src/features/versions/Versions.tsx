import { Container } from "@mui/system"
import { useAppSelector } from "../../app/hooks"
import { selectSystemData } from "../system_data/SystemDataSlice"

export const Versions = () => {
    const backendVersion = useAppSelector(selectSystemData).backend_version
    // const frontendVersion = `${process.env.REACT_APP_VERSION}`
    const currentYear = new Date().getFullYear()

    return(
        <Container sx={{marginLeft: -2}}>
            Version {backendVersion}
            <br/>
            {currentYear === 2022 as number?
            `© ${currentYear} dissecto GmbH`
            : 
            `© 2022-${currentYear} dissecto GmbH`}
        </Container>
    )
}
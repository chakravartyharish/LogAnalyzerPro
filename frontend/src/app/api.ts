import axios from 'axios'
import dcrf from 'dcrf-client'

export const baseBackendURL = `${window.location.hostname}:8000`
export const httpBackendURL = `http://${baseBackendURL}`

export const restClient = axios.create({
    baseURL: `${httpBackendURL}/api`,
    timeout: 2000,
    headers: {'Content-Type': 'application/json'}
})

// see store.ts for the other websocket connections
export const dcrfClient = dcrf.connect(`ws://${baseBackendURL}/ws/dcrf/`)

// register our own "on reconnect" handler
dcrfClient.transport.on("reconnect", () => {
    // NOTE: just always reload the GUI here
    //       (dont worry about a potential inconsistent GUI vs. backend "state")
    switch (process.env.REACT_APP_PERSONALITY_NAME) {
       case "HydraScope":
            window.location.reload()
            break
    }
})

// TODO: move to "constants"
export const jobArtifactsPath = "job_artifacts"

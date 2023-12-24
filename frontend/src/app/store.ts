import { configureStore, ThunkAction, Action, Middleware, combineReducers } from '@reduxjs/toolkit';
import mainLuminoWidgetReducer from "../features/main_lumino_widget/MainLuminoWidgetSlice";
import userMessagesReducer from "../features/user_message/UserMessageSlice";
import backendEventsReducer from "../features/backend_event/BackendEventSlice";
import udsScanRunReducer from "../features/uds_scan_run/UDSScanRunsSlice";
import settingsReducer from "../features/settings/SettingsSlice"
import systemDataReducer from "../features/system_data/SystemDataSlice"
import userDataReducer from "../features/settings/UserDataSlice"

import { fetchAndSubscribeAllData } from '../App';

// Use combineReducers for configureStore reducer to avoid circular import problems
// https://redux.js.org/usage/usage-with-typescript#type-checking-middleware
const rootReducer = combineReducers({ 
  mainLuminoWidget: mainLuminoWidgetReducer,
  userMessages: userMessagesReducer,
  backendEvents: backendEventsReducer,
  udsScanRuns: udsScanRunReducer,
  settings: settingsReducer,
  systemData: systemDataReducer,
  userData: userDataReducer,
 });

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware( { serializableCheck: { ignoredActionPaths: ['meta.timestamp', 'payload'] } } )
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof rootReducer>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

// NOTE: this only runs once during app initialization
//       it gets executed here to avoid a race condition
//       where the store is not yet initialized but needed in fetchAndSubscribeAllData
if (typeof window !== 'undefined') {
  if (process.env.REACT_APP_PERSONALITY_NAME === 'HydraScope') {
      fetchAndSubscribeAllData()
  }
}
import { DeviceEventEmitter } from 'react-native';

export const DATA_CHANGED_EVENT = 'dataChanged';

export function emitDataChanged() {
  DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
}

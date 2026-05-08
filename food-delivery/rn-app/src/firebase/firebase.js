import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import database from '@react-native-firebase/database';
import storage from '@react-native-firebase/storage';
import messaging from '@react-native-firebase/messaging';

export const firebaseAuth = auth();
export const db = firestore();
export const rtdb = database();
export const firebaseStorage = storage();
export const firebaseMessaging = messaging();

export default {
  auth,
  firestore,
  database,
  storage,
  messaging,
};

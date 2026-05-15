import { doc, getDoc, getFirestore } from 'firebase/firestore';

// Esta es la versión actual de tu código
export const APP_VERSION = '2.0';

export interface UpdateInfo {
  version: string;
  url: string;
  force: boolean;
  notes: string;
}

export const checkUpdates = async (): Promise<UpdateInfo | null> => {
  try {
    const db = getFirestore();
    const updateDoc = await getDoc(doc(db, 'configuracion', 'version_app'));

    if (updateDoc.exists()) {
      const data = updateDoc.data() as UpdateInfo;
      // Comparamos si la versión de la nube es diferente a la local
      if (data.version !== APP_VERSION) {
        return data;
      }
    }
    return null;
  } catch (error) {
    console.error('Error al verificar actualizaciones:', error);
    return null;
  }
};

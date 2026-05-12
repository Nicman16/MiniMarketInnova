const admin = require('firebase-admin');

const getAuth = () => {
  if (!admin.apps.length) {
    throw new Error('Firebase Admin no esta inicializado');
  }
  return admin.auth();
};

const getUserByEmailSafe = async (email) => {
  try {
    return await getAuth().getUserByEmail(email);
  } catch (error) {
    if (error && error.code === 'auth/user-not-found') return null;
    throw error;
  }
};

const upsertAuthUser = async ({ email, password, displayName, emailVerified = false, disabled = false }) => {
  const auth = getAuth();
  const existing = await getUserByEmailSafe(email);

  if (existing) {
    const update = { displayName, emailVerified, disabled };
    if (password) update.password = password;
    return auth.updateUser(existing.uid, update);
  }

  return auth.createUser({ email, password, displayName, emailVerified, disabled });
};

const updateAuthAfterActivation = async ({ email, password }) => {
  const authUser = await getUserByEmailSafe(email);
  if (!authUser) return null;
  return getAuth().updateUser(authUser.uid, { password, emailVerified: true, disabled: false });
};

module.exports = {
  upsertAuthUser,
  updateAuthAfterActivation
};

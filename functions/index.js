const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Función Callable para crear o actualizar un usuario anfitrión (Gen 2).
 * Recibe un 'username' y 'password' desde el cliente en request.data.
 */
exports.createOrUpdateHostUser = onCall(async (request) => {
  // 1. Verificar que la llamada viene de un usuario autenticado (el super-admin)
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "La función solo puede ser llamada por un usuario autenticado.",
    );
  }

  const username = request.data.username;
  const password = request.data.password;

  if (!username || !password || password.length < 6) {
    throw new HttpsError(
        "invalid-argument",
        "El nombre de usuario y una contraseña de al menos 6 caracteres son requeridos.",
    );
  }

  const email = `${username}@tufiestadigital.com.ar`;

  try {
    // Intentar obtener el usuario por email
    const userRecord = await admin.auth().getUserByEmail(email);
    // Si el usuario ya existe, actualizamos su contraseña
    await admin.auth().updateUser(userRecord.uid, {
      password: password,
    });
    return {message: `Usuario anfitrión '${email}' actualizado con éxito.`};
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      // Si el usuario no existe, lo creamos
      await admin.auth().createUser({email, password});
      return {message: `Usuario anfitrión '${email}' creado con éxito.`};
    }
    // Si es otro tipo de error, lo lanzamos
    throw new HttpsError("internal", error.message);
  }
});
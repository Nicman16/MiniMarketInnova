// Módulo centralizado para acceder a la instancia de Socket.IO
// Evita dependencias circulares entre rutas y el servidor

let _io = null;

const setIo = (io) => { _io = io; };
const emit = (event, data) => { if (_io) _io.emit(event, data); };
const getIo = () => _io;

module.exports = { setIo, emit, getIo };

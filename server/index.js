import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
})

const PORT = 8000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));

const channels = {
    global: { users: [] }
};

const getRooms = (req, res) => {
    return res.status(200).json(Object.keys(channels));
};

const getUsers = (req, res) => {
    const { roomId } = req.params;
    const users = channels[roomId] ? channels[roomId].users.map((user) => user.publicKey) : [];
    return res.status(200).json(users);
};

app.get('/', getRooms);
app.get('/:roomId/users', getUsers);


io.on('connection', socket => {
    socket.on('create-chat', ({ roomId }) => {
        channels[roomId] = { users: [] };
    })
    socket.on('enter-chat', ({ roomId, publicKey }) => {
        socket.join(roomId);
        channels[roomId].users.push({ id: socket.id, publicKey });
    });
    socket.on('send-message', ({ roomId, message }) => {
        io.to(roomId).emit('message', message);
    });
    socket.on('disconnecting', () => {
        const rooms = socket.rooms;
        rooms.forEach((roomId) => {
            if (!channels[roomId]) return;
            const userIndex = channels[roomId].users.indexOf((user) => user.id === socket.id)
            channels[roomId].users.splice(userIndex, 1);

        })
    })
});
import React, { useEffect, useState } from 'react'
import { Button, List, Header } from 'semantic-ui-react'
import { nanoid } from 'nanoid'
import { Link, useNavigate } from 'react-router-dom';
import './App.css';
import 'semantic-ui-css/semantic.min.css'

function Home({ socket, senderAddress, connect }) {
    const navigate = useNavigate();

    const [rooms, setRooms] = useState([]);

    const getRooms = async () => {
        const response = await fetch('http://localhost:8000');
        const rooms = await response.json();
        setRooms(rooms);
    }

    useEffect(() => {
        const intervalId = setInterval(() => getRooms(), 1000);
        return () => {
            clearInterval(intervalId);
        }
    }, []);

    const createRoom = () => {
        const roomId = nanoid();
        navigate(`/${roomId}`);
        if (!socket.connected) {
            socket.connect()
        }
        socket.emit('create-chat', { roomId });
    }

    return (
        <div className='Home'>
            <Button onClick={createRoom}>Create Room</Button>
            {!senderAddress && <Button onClick={connect}>Connect MetaMask</Button>}
            <Header as='h2'>Rooms</Header>
            <List>
                {rooms.map((roomId) => {
                    return <>
                        <Link key={roomId} to={`/${roomId}`}>{roomId}</Link>
                        <br />
                    </>
                })}
            </List>
        </div>
    )
}

export default Home;
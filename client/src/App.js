import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import Home from './Home';
import Room from './Room';
import './App.css';
import 'semantic-ui-css/semantic.min.css'

function App() {
  const [socket, setSocket] = useState({});
  const [senderAddress, setSenderAddress] = useState('');
  const [senderPublicKey, setSenderPublicKey] = useState('');

  useEffect(() => {
    const socket = io('http://localhost:8000');
    setSocket(socket);
  }, []);

  const connect = async () => {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    const senderAddress = accounts[0];
    setSenderAddress(senderAddress)
    const publicKey = await window.ethereum.request({
      method: 'eth_getEncryptionPublicKey',
      params: [senderAddress]
    });
    setSenderPublicKey(publicKey)
  }

  useEffect(() => {
    if (senderPublicKey) return;
    connect();
  }, []);

  return (
    <Router>
      <Routes>
        <Route exact path='/' element={
          <Home
            socket={socket}
            senderAddress={senderAddress}
            connect={connect}
          />
        } />
        <Route path='/*' element={
          <Room
            socket={socket}
            senderAddress={senderAddress}
            senderPublicKey={senderPublicKey}
          />
        } />
      </Routes>
    </Router>
  )
}

export default App;

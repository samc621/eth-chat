import React, { useEffect, useState } from 'react'
import { Button, Comment, Form, Header } from 'semantic-ui-react'
import { useLocation, useNavigate } from 'react-router-dom';
import { encrypt } from '@metamask/eth-sig-util';
import './App.css';
import 'semantic-ui-css/semantic.min.css'

function Room({ socket, senderAddress, senderPublicKey }) {
    const location = useLocation();
    const roomId = location.pathname.replace(/\//, '');

    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [isEntered, setIsEntered] = useState(false);
    const [messages, setMessages] = useState([]);
    const [recipientPublicKey, setRecipientPublicKey] = useState('');
    const [message, setMessage] = useState('');

    const stringifiableToHex = (value) => window.ethers.utils.hexlify(Buffer.from(JSON.stringify(value)));

    const getUsers = async () => {
        const response = await fetch(`http://localhost:8000/${roomId}/users`);
        const users = await response.json();
        setUsers(users);
    }

    useEffect(() => {
        const intervalId = setInterval(() => getUsers(), 1000);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (Object.keys(socket).length === 0) return;
        socket.on('message', message => {
            setMessages(messages => [...messages, message]);
        })
        return () => {
            socket.disconnect();
        }
    }, [socket]);

    useEffect(() => {
        if (users.includes(senderPublicKey)) {
            setIsEntered(true);
        }
    }, [users])

    const enterChat = async () => {
        if (!socket.connected) {
            socket.connect()
        }
        socket.emit('enter-chat', { roomId, publicKey: senderPublicKey });
        setIsEntered(true);
    };

    const leaveChat = () => {
        socket.disconnect();
        setIsEntered(false);
    }

    const userOptions = users.map((user) => {
        return {
            key: user,
            text: `${user}${user === senderPublicKey ? ' (you)' : ''}`,
            value: user
        }
    })

    const encryptMessage = (message) => encrypt({ publicKey: recipientPublicKey, data: message, version: 'x25519-xsalsa20-poly1305' })

    const decryptMessage = async (ciphertext) => await window.ethereum.request({
        method: 'eth_decrypt',
        params: [ciphertext, senderAddress]
    });

    const sendMessage = () => {
        const text = stringifiableToHex(encryptMessage(message));
        socket.emit('send-message', { roomId, message: { ts: Date.now(), text, senderPublicKey, recipientPublicKey } })
    };

    const isHex = (text) => /[0-9A-Fa-f]{6}/g.test(text);

    const updateMessageText = (index, text) => {
        const newMessages = [...messages];
        newMessages[index].text = text;
        if (!isHex(text) && !newMessages[index].decryptedText) {
            newMessages[index].decryptedText = text;
        }
        setMessages(newMessages);
    }

    const returnHome = () => {
        navigate('/');
    }

    return (
        <div className='Room'>
            {senderPublicKey && <Button onClick={enterChat} disabled={isEntered}>Enter chat</Button>}
            {isEntered && <Button onClick={leaveChat}>Leave chat</Button>}
            <Button onClick={returnHome}>Return Home</Button>

            <Comment.Group className='Messages'>
                <Header as='h3' dividing>
                    Users
                </Header>
                {users.map((user) => <p key={user}>{user}</p>)}

                <Header as='h3' dividing>
                    Messages
                </Header>
                {messages.map((message, index) => {
                    return (
                        <Comment key={index}>
                            <Comment.Content>
                                <Comment.Author>From {message.senderPublicKey} to {message.recipientPublicKey}</Comment.Author>
                                <Comment.Metadata>
                                    <div>at {new Date(message.ts).toLocaleString()}</div>
                                </Comment.Metadata>
                                <Comment.Text>{(!isHex(message.text) && message.decryptedText) || message.text}</Comment.Text>
                                <Comment.Actions>
                                    {message.recipientPublicKey === senderPublicKey && <Comment.Action onClick={async () => {
                                        const text = isHex(message.text) ? (message.decryptedText || await decryptMessage(message.text)) : stringifiableToHex(encryptMessage(message.text));
                                        updateMessageText(index, text);
                                    }}>{isHex(message.text) ? 'Decrypt' : 'Encrypt'}</Comment.Action>}
                                </Comment.Actions>
                            </Comment.Content>
                        </Comment>
                    )
                })}

                <Form reply onSubmit={() => {
                    sendMessage({ text: message })
                    setMessage('');
                }}>
                    <Form.Select placeholder='Recipient' value={recipientPublicKey} options={userOptions} onChange={(e, data) => setRecipientPublicKey(data.value)} />
                    <Form.TextArea placeholder='Type message here...' value={message} onChange={(e) => setMessage(e.target.value)} />
                    <Button content='Send' labelPosition='left' icon='edit' primary disabled={!isEntered || !message || !recipientPublicKey} />
                </Form>
            </Comment.Group>
        </div>
    );
}

export default Room;
import { Server, Socket } from 'socket.io';
import { ChatMessage } from '../models/chat.model';

export class SocketService {
    private static _io: Server;

    static init(server: any) {
        this._io = new Server(server, {
            cors: {
                origin: 'http://localhost:3000',
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

        this._io.on('connection', (socket: Socket) => {
            console.log('User connected:', socket.id);

            socket.on('join_room', (userId: string) => {
                socket.join(userId);
                console.log(`User ${userId} joined room`);
            });

            socket.on('send_message', async (data: { senderId: string, receiverId: string, message: string }) => {
                try {
                    const chatMsg = await ChatMessage.create({
                        senderId: data.senderId,
                        receiverId: data.receiverId,
                        message: data.message
                    });

                    // Emit to receiver's room
                    this._io.to(data.receiverId).emit('receive_message', chatMsg);
                    // Emit back to sender
                    socket.emit('message_sent', chatMsg);
                } catch (error) {
                    console.error('Socket error:', error);
                }
            });

            socket.on('disconnect', () => {
                console.log('User disconnected');
            });
        });
    }

    static getIO() {
        if (!this._io) throw new Error('Socket.io not initialized');
        return this._io;
    }
}

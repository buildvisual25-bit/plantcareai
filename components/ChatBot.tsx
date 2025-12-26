import React, { useState, useRef, useEffect } from 'react';
import { chatWithBotanist, generateSpeech } from '../services/geminiService';
import { ChatMessage } from '../types';

// Helper functions for PCM Audio Decoding
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const ChatBot: React.FC<{ autoSpeak: boolean }> = ({ autoSpeak }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: "Hello! I'm Evan. Ask me anything about your garden!", timestamp: Date.now() }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input;
    setInput('');
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      // Prepare history for API
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await chatWithBotanist(history, userText);

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, botMsg]);

      if (autoSpeak) {
        const audioData = await generateSpeech(responseText);
        if (audioData) {
            playAudio(audioData);
        }
      }

    } catch (error) {
      console.error("Chat error", error);
    } finally {
      setIsTyping(false);
    }
  };

  const playAudio = async (base64Data: string) => {
      if (isPlaying) return;
      
      try {
          if (!audioContextRef.current) {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
          }
          const ctx = audioContextRef.current;
          if(ctx.state === 'suspended') {
              await ctx.resume();
          }

          const pcmData = decode(base64Data);
          const audioBuffer = await decodeAudioData(pcmData, ctx, 24000, 1);
          
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          
          setIsPlaying(true);
          source.start(0);
          
          source.onended = () => {
              setIsPlaying(false);
          };

      } catch (e) {
          console.error("Audio playback error", e);
          setIsPlaying(false);
      }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          handleSend();
      }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
                className={`max-w-[80%] p-3 rounded-2xl ${
                    msg.role === 'user' 
                    ? 'bg-emerald-600 text-white rounded-tr-none' 
                    : 'bg-white/10 text-gray-100 rounded-tl-none border border-white/5'
                } shadow-md`}
            >
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <span className="text-[10px] opacity-50 block text-right mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
            </div>
          </div>
        ))}
        
        {isTyping && (
             <div className="flex justify-start animate-fade-in">
                <div className="bg-white/10 p-4 rounded-2xl rounded-tl-none border border-white/5 flex gap-2 items-center">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-150"></span>
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-300"></span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="absolute bottom-4 left-0 right-0 px-4 bg-transparent">
        <div className="flex gap-2 bg-gray-900/80 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-xl">
             <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your garden..."
                className="flex-1 bg-transparent text-white px-4 py-2 text-sm focus:outline-none placeholder-gray-500"
            />
            <button 
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="bg-emerald-600 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500 transition-all active:scale-90"
            >
                {isTyping ? '...' : '➤'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
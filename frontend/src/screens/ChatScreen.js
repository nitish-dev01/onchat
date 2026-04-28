import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import {
  getChannelMessages, sendMessage, addReaction, removeReaction
} from '../services/api';
import socket from '../services/socket';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ChatScreen({ route, navigation }) {
  const { channelId, channelName } = route.params;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [showReactions, setShowReactions] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: channelName });
    loadMessages();
    setupSocket();

    return () => {
      socket.leaveChannel(channelId);
      socket.removeListener('new_message', handleNewMessage);
      socket.removeListener('user_typing', handleTyping);
    };
  }, [channelId]);

  const setupSocket = () => {
    socket.joinChannel(channelId);
    socket.addListener('new_message', handleNewMessage);
    socket.addListener('user_typing', handleTyping);
  };

  const handleNewMessage = (data) => {
    if (data.channel_id === channelId) {
      // Optimistically add message (actual API call already sent it)
    }
  };

  const handleTyping = (data) => {
    if (data.channel_id === channelId) {
      // Could track typing users here
    }
  };

  const loadMessages = async () => {
    try {
      const data = await getChannelMessages(channelId);
      setMessages(data.reverse()); // Oldest first for chat
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    setSending(true);
    const content = inputText.trim();
    setInputText('');

    try {
      const message = await sendMessage({
        channel_id: channelId,
        content,
        message_type: 'text',
      });
      setMessages(prev => [...prev, message]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setInputText(content); // Restore on error
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await addReaction(messageId, emoji);
      // Reload messages to get updated reactions
      await loadMessages();
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
    setShowReactions(null);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'long', day: 'numeric' });
  };

  const renderMessage = ({ item, index }) => {
    const showDate = index === 0 ||
      formatDate(item.created_at) !== formatDate(messages[index - 1].created_at);

    return (
      <View>
        {showDate && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        <View style={styles.messageContainer}>
          <TouchableOpacity
            style={styles.messageBubble}
            onLongPress={() => setShowReactions(item.id)}
            delayLongPress={300}
          >
            <View style={styles.messageHeader}>
              <Text style={styles.senderName}>{item.sender_username}</Text>
              <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
            </View>
            <Text style={styles.messageContent}>{item.content}</Text>
            {item.reactions && item.reactions.length > 0 && (
              <View style={styles.reactionsRow}>
                {item.reactions.map((reaction, i) => (
                  <View key={i} style={styles.reactionBadge}>
                    <Text>{reaction.emoji} {reaction.count}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
          {showReactions === item.id && (
            <View style={styles.reactionPicker}>
              {EMOJI_OPTIONS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => handleReaction(item.id, emoji)}
                  style={styles.reactionButton}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {typingUsers.length > 0 && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 10,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateText: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 12,
    color: '#666',
  },
  messageContainer: {
    marginVertical: 4,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    padding: 10,
    paddingHorizontal: 14,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    marginLeft: 8,
  },
  messageContent: {
    fontSize: 16,
    color: '#333',
  },
  reactionsRow: {
    flexDirection: 'row',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  reactionBadge: {
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionPicker: {
    position: 'absolute',
    bottom: 40,
    left: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    flexDirection: 'row',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  reactionButton: {
    padding: 8,
  },
  reactionEmoji: {
    fontSize: 24,
  },
  typingIndicator: {
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  typingText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
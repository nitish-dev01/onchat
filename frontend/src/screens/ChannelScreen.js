import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert
} from 'react-native';
import {
  getChannel, getChannelMembers, getChannelMessages,
  sendMessage, addMember, removeMember, deleteChannel
} from '../services/api';
import socket from '../services/socket';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function ChannelScreen({ route, navigation }) {
  const { channelId, channelName } = route.params;
  const [channel, setChannel] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [showReactions, setShowReactions] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      title: channelName,
      headerRight: () => (
        <TouchableOpacity onPress={() => setShowMembers(!showMembers)}>
          <Text style={{ color: '#007AFF', marginRight: 15 }}>Members</Text>
        </TouchableOpacity>
      ),
    });
    loadChannel();
    setupSocket();

    return () => {
      socket.leaveChannel(channelId);
      socket.removeListener('new_message', handleNewMessage);
    };
  }, [channelId, showMembers]);

  const setupSocket = () => {
    socket.joinChannel(channelId);
    socket.addListener('new_message', handleNewMessage);
  };

  const handleNewMessage = (data) => {
    if (data.channel_id === channelId) {
      // Reload messages on new message
    }
  };

  const loadChannel = async () => {
    try {
      const channelData = await getChannel(channelId);
      setChannel(channelData);

      const membersData = await getChannelMembers(channelId);
      setMembers(membersData);

      const messagesData = await getChannelMessages(channelId);
      setMessages(messagesData.reverse());
    } catch (error) {
      console.error('Failed to load channel:', error);
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
      setInputText(content);
    } finally {
      setSending(false);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await addReaction(messageId, emoji);
      await loadChannel();
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

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
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
    <View style={styles.container}>
      {showMembers && (
        <View style={styles.membersPanel}>
          <View style={styles.membersHeader}>
            <Text style={styles.membersTitle}>Members ({members.length})</Text>
            <TouchableOpacity onPress={() => setShowMembers(false)}>
              <Text style={{ color: '#007AFF' }}>Close</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={members}
            keyExtractor={(item) => item.user_id.toString()}
            renderItem={({ item }) => (
              <View style={styles.memberItem}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {item.username.charAt(0).toUpperCase()}
                  </Text>
                  {item.is_online && <View style={styles.onlineDot} />}
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.username}</Text>
                  <Text style={styles.memberRole}>{item.role}</Text>
                </View>
              </View>
            )}
          />
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Message #channel..."
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
    </View>
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
  membersPanel: {
    height: 250,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f8f8f8',
  },
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  membersTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5856D6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#f8f8f8',
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  memberRole: {
    fontSize: 13,
    color: '#666',
    textTransform: 'capitalize',
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
    color: '#5856D6',
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
    backgroundColor: '#5856D6',
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
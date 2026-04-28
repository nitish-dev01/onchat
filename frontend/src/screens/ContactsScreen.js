import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, ActivityIndicator
} from 'react-native';
import { searchUsers, addContact, getContacts } from '../services/api';
import socket from '../services/socket';

export default function ContactsScreen({ navigation }) {
  const [contacts, setContacts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadContacts();
    socket.addListener('user_online', handlePresenceChange);
    socket.addListener('user_offline', handlePresenceChange);

    return () => {
      socket.removeListener('user_online', handlePresenceChange);
      socket.removeListener('user_offline', handlePresenceChange);
    };
  }, []);

  const handlePresenceChange = (data) => {
    setContacts(prev =>
      prev.map(contact =>
        contact.id === data.user_id
          ? { ...contact, is_online: data.is_online }
          : contact
      )
    );
  };

  const loadContacts = async () => {
    try {
      const data = await getContacts();
      setContacts(data);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddContact = async (userId) => {
    try {
      await addContact(userId);
      await loadContacts();
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Failed to add contact:', error);
    }
  };

  const renderContact = ({ item }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => navigation.navigate('Chat', {
        channelId: item.user_id,
        channelName: item.full_name || item.username
      })}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.full_name || item.username).charAt(0).toUpperCase()}
        </Text>
        {item.is_online && <View style={styles.onlineIndicator} />}
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.full_name || item.username}</Text>
        <Text style={styles.contactStatus}>
          {item.is_online ? 'Online' : `Last seen ${formatLastSeen(item.last_seen)}`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity style={styles.contactItem} onPress={() => handleAddContact(item.id)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.full_name || item.username).charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.full_name || item.username}</Text>
        <Text style={styles.contactStatus}>{item.email}</Text>
      </View>
      <Text style={styles.addButton}>Add</Text>
    </TouchableOpacity>
  );

  const formatLastSeen = (dateString) => {
    if (!dateString) return 'never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);

    if (diffMins < 1) return 'recently';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
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
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searching && <ActivityIndicator style={styles.searchSpinner} />}
      </View>

      {searchQuery.length >= 2 ? (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No users found</Text>
          }
        />
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No contacts yet</Text>
              <Text style={styles.emptyHint}>Search for users to add</Text>
            </View>
          }
        />
      )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  searchSpinner: {
    marginLeft: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#fff',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 15,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  contactStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  addButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  emptyHint: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
  },
});
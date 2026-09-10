import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, Alert, TouchableOpacity, ScrollView, Linking, Image } from 'react-native';
import { Audio } from 'expo-av';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as eva from '@eva-design/eva';
import { ApplicationProvider, Layout, KText, KButton } from '@ui-kitten/components';
import { theme } from './theme';
import { initializeApp } from 'firebase/app';
import { getFirestore, updateDoc, increment, onSnapshot, setDoc, addDoc, collection } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID } from '@env';
import { BleManager } from 'react-native-ble-plx';

let intervalId = null;
let readings = [];

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const COLORS = {
  background: '#1a0e2e',
  backgroundLight: '#2d1b69',
  mint: '#66d9a0',
  persian: '#00a693',
  violet: '#8b5cf6',
  violetLight: '#a78bfa',
  white: '#ffffff',
  text: '#e0d7f5',
  textMuted: '#9a8ab5',
  card: '#2d1b69',
  emergency: '#ff4444',
};

const fakeProfiles = [
  {
    id: 'f1',
    name: 'DJ Sparks',
    role: 'Performer',
    image: 'https://i.pravatar.cc/150?img=1',
    status: 'LIVE ON STAGE',
    distance: '30m away',
    vibe: 'Bass is insane!',
    signal: 'Excellent',
  },
  {
    id: 'f2',
    name: 'Chris Keller',
    role: 'Attendee',
    image: 'https://i.pravatar.cc/150?img=2',
    status: 'Dancing',
    distance: '2m away',
    vibe: 'This set is amazing!',
    signal: 'Strong',
  },
  {
    id: 'f3',
    name: 'Jessica Vance',
    role: 'Attendee',
    image: 'https://i.pravatar.cc/150?img=3',
    status: 'At Bar',
    distance: '7m away',
    vibe: 'Line for drinks is moving!',
    signal: 'Strong',
  },
  {
    id: 'f4',
    name: 'Marcus Brodie',
    role: 'Attendee',
    image: 'https://i.pravatar.cc/150?img=4',
    status: 'Pit Area',
    distance: '4m away',
    vibe: 'Who has extra glowsticks?',
    signal: 'Excellent',
  },
  {
    id: 'f5',
    name: 'Elena Vance',
    role: 'Attendee',
    image: 'https://i.pravatar.cc/150?img=5',
    status: 'Dancing',
    distance: '12m away',
    vibe: 'Lost my group but vibing!',
    signal: 'Good',
  },
  {
    id: 'f6',
    name: 'Danny T.',
    role: 'Attendee',
    image: 'https://i.pravatar.cc/150?img=6',
    status: 'Merch Stand',
    distance: '25m away',
    vibe: 'Limited edition shirts!',
    signal: 'Weak',
  },
];

const livePerformers = [
  {
    id: 1,
    name: 'Medina Guitarist',
    boosts: 42,
    mutes: 5,
    followers: 128,
    bio: 'Street guitarist playing soulful melodies in the medina.',
    coordinates: { latitude: 33.8935, longitude: -5.5538 },
    image: 'https://i.pravatar.cc/150?img=7',
    location: 'Medina, Meknes',
    rating: 4.8,
  },
  {
    id: 2,
    name: 'Street Drummer',
    boosts: 31,
    mutes: 3,
    followers: 87,
    bio: 'Rhythms from the heart of the city.',
    coordinates: { latitude: 33.8950, longitude: -5.5550 },
    image: 'https://i.pravatar.cc/150?img=8',
    location: 'Place El Hedim',
    rating: 4.5,
  },
  {
    id: 3,
    name: 'Coffee Shop Singer',
    boosts: 18,
    mutes: 2,
    followers: 54,
    bio: 'Acoustic covers and originals.',
    coordinates: { latitude: 33.8920, longitude: -5.5520 },
    image: 'https://i.pravatar.cc/150?img=9',
    location: 'Rue de Paris',
    rating: 4.2,
  },
];

const performers = [
  { id: 1, name: 'Medina Guitarist', boosts: 42, mutes: 5, followers: 128, bio: 'Street guitarist playing soulful melodies in the medina.' },
  { id: 2, name: 'Street Drummer', boosts: 31, mutes: 3, followers: 87, bio: 'Rhythms from the heart of the city.' },
  { id: 3, name: 'Coffee Shop Singer', boosts: 18, mutes: 2, followers: 54, bio: 'Acoustic covers and originals.' },
  { id: 99, name: 'You (Citizen Performer)', boosts: 0, mutes: 0, followers: 0, bio: 'Start performing to build your profile!' },
];

const performerProfiles = {
  1: { image: 'https://i.pravatar.cc/150?img=7', location: 'Medina, Meknes', rating: 4.8 },
  2: { image: 'https://i.pravatar.cc/150?img=8', location: 'Place El Hedim', rating: 4.5 },
  3: { image: 'https://i.pravatar.cc/150?img=9', location: 'Rue de Paris', rating: 4.2 },
  99: { image: 'default', location: 'Your City', rating: 0 },
};

export default function App() {
  // --- Core App State ---
  const [permission, setPermission] = useState(false);
  const [recording, setRecording] = useState(null);
  const [decibels, setDecibels] = useState(0);
  const [boostCount, setBoostCount] = useState(0);
  const [muteCount, setMuteCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showPerformerProfile, setShowPerformerProfile] = useState(false);
  const [selectedPerformer, setSelectedPerformer] = useState(null);
  const [mode, setMode] = useState('citizen');
  const [isLive, setIsLive] = useState(false);
  const [isBluetoothConnected, setIsBluetoothConnected] = useState(false);
  const [bluetoothDevice, setBluetoothDevice] = useState(null);
  const [volumeLevel, setVolumeLevel] = useState(50);
  const [volumeSteps, setVolumeSteps] = useState(0);
  const [viewMode, setViewMode] = useState('map');
  const [emergencyReports, setEmergencyReports] = useState([]);
  const [activeTab, setActiveTab] = useState('feed');

  // --- Firebase State ---
  const [userId, setUserId] = useState(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- Super Boost/Mute State ---
  const [superBoostCount, setSuperBoostCount] = useState(0);
  const [superMuteCount, setSuperMuteCount] = useState(0);

  // --- Bluetooth State ---
  const [isSpeakerConnected, setIsSpeakerConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);

  // --- Other ---
  const activeUsers = Math.floor(Math.random() * 100) + 50;
  const manager = new BleManager();

  const scanForSpeakers = () => {
    setIsScanning(true);
    setAvailableDevices([]);
    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log('Scan error:', error);
        return;
      }
      if (device.name && device.name.includes('Speaker') || device.name.includes('JBL') || device.name.includes('Bose')) {
        setAvailableDevices(prev => [...prev, device]);
      }
    });
    setTimeout(() => {
      manager.stopDeviceScan();
      setIsScanning(false);
    }, 10000);
  };

  const connectToDevice = async (device) => {
    try {
      const connected = await device.connect();
      await connected.discoverAllServicesAndCharacteristics();
      setIsSpeakerConnected(true);
      setConnectedDevice(device);
      console.log('Connected to:', device.name);
    } catch (error) {
      console.log('Connection error:', error);
    }
  };

  const sendVolumeCommand = async (volume) => {
    if (!isSpeakerConnected || !connectedDevice) {
      console.log('No device connected');
      return;
    }
    try {
      console.log('Sending volume:', volume);
    } catch (error) {
      console.log('Volume command error:', error);
    }
  };

  useEffect(() => {
    signInAnonymously(auth)
      .then((userCredential) => {
        const user = userCredential.user;
        setUserId(user.uid);
        setIsFirebaseReady(true);
        setIsLoading(false);
        console.log('Logged in anonymously:', user.uid);
      })
      .catch((error) => {
        console.log('Auth error:', error);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!isFirebaseReady) return;
    const performerId = '1';
    const performerRef = doc(db, 'performers', performerId);
    const unsubscribe = onSnapshot(performerRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        console.log('Real-time update:', data);
        if (data.boosts !== undefined) {
          setBoostCount(data.boosts);
        }
        if (data.mutes !== undefined) {
          setMuteCount(data.mutes);
        }
      } else {
        setDoc(performerRef, {
          name: 'Medina Guitarist',
          boosts: 0,
          mutes: 0,
          isLive: false,
          location: { lat: 33.8935, lng: -5.5538 }
        });
      }
    }, (error) => {
      console.log('Firestore listener error:', error);
    });
    return () => unsubscribe();
  }, [isFirebaseReady]);

  if (isLoading) {
    return (
      <ApplicationProvider {...eva} theme={eva.light}>
        <Layout style={styles.centerContainer}>
          <KText style={styles.loadingText}>Loading...</KText>
        </Layout>
      </ApplicationProvider>
    );
  }

  const getPermission = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status === 'granted') {
        setPermission(true);
      } else {
        Alert.alert('Permission Denied', 'Microphone access is required');
      }
    } catch (error) {
      console.log('Error getting permission:', error);
    }
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location is needed to boost performers.');
      return null;
    }
    const location = await Location.getCurrentPositionAsync({});
    return location;
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000;
  };

  const handleBoost = async () => {
    const location = await getLocation();
    if (!location) return;
    const performer = livePerformers[0];
    const distance = calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      performer.coordinates.latitude,
      performer.coordinates.longitude
    );
    if (distance > 100) {
      Alert.alert('Too Far', 'You need to be within 100m of the performer to boost.');
      return;
    }
    if (isFirebaseReady && userId) {
      try {
        const performerRef = doc(db, 'performers', String(performer.id));
        await updateDoc(performerRef, {
          boosts: increment(1)
        });
        console.log('Boost saved to Firestore');
      } catch (error) {
        console.log('Firestore error:', error);
      }
    }
    const newVolume = Math.min(1, (volumeLevel + 5) / 100);
    try {
      await Audio.setVolumeAsync(newVolume);
      console.log('System volume changed to:', newVolume);
    } catch (error) {
      console.log('Volume error:', error);
    }
    const newVolumeLevel = Math.min(100, volumeLevel + 5);
    setVolumeLevel(newVolumeLevel);
    setBoostCount(boostCount + 1);
  };

  const handleMute = () => {
    const performer = livePerformers[0];
    if (isFirebaseReady && userId) {
      try {
        const performerRef = doc(db, 'performers', String(performer.id));
        updateDoc(performerRef, {
          mutes: increment(1)
        });
        console.log('Mute saved to Firestore');
      } catch (error) {
        console.log('Firestore error:', error);
      }
    }
    const newVolume = Math.max(0, (volumeLevel - 5) / 100);
    try {
      Audio.setVolumeAsync(newVolume);
      console.log('System volume changed to:', newVolume);
    } catch (error) {
      console.log('Volume error:', error);
    }
    const newVolumeLevel = Math.max(0, volumeLevel - 5);
    setVolumeLevel(newVolumeLevel);
    setMuteCount(muteCount + 1);
  };

  const handleSuperBoost = async () => {
    const location = await getLocation();
    if (!location) return;
    const performer = livePerformers[0];
    const distance = calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      performer.coordinates.latitude,
      performer.coordinates.longitude
    );
    if (distance > 100) {
      Alert.alert('Too Far', 'You need to be within 100m of the performer to super boost.');
      return;
    }
    Alert.alert(
      'Super Boost',
      'Increase volume by 20 per cent for $0.99. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay $0.99',
          onPress: async () => {
            if (isFirebaseReady && userId) {
              try {
                const performerRef = doc(db, 'performers', String(performer.id));
                await updateDoc(performerRef, {
                  superBoosts: increment(1)
                });
                console.log('Super Boost saved to Firestore');
              } catch (error) {
                console.log('Firestore error:', error);
              }
            }
            const newVolume = Math.min(1, (volumeLevel + 20) / 100);
            try {
              await Audio.setVolumeAsync(newVolume);
              console.log('Super Boost: Volume changed to:', newVolume);
            } catch (error) {
              console.log('Volume error:', error);
            }
            const newVolumeLevel = Math.min(100, volumeLevel + 20);
            setVolumeLevel(newVolumeLevel);
            setSuperBoostCount(superBoostCount + 1);
            Alert.alert('Success', 'Volume increased by 20 per cent.');
          }
        }
      ]
    );
  };

  const handleSuperMute = async () => {
    const location = await getLocation();
    if (!location) return;
    const performer = livePerformers[0];
    const distance = calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      performer.coordinates.latitude,
      performer.coordinates.longitude
    );
    if (distance > 100) {
      Alert.alert('Too Far', 'You need to be within 100m of the performer to super mute.');
      return;
    }
    Alert.alert(
      'Super Mute',
      'Decrease volume by 20 per cent for $0.99. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay $0.99',
          onPress: async () => {
            if (isFirebaseReady && userId) {
              try {
                const performerRef = doc(db, 'performers', String(performer.id));
                await updateDoc(performerRef, {
                  superMutes: increment(1)
                });
                console.log('Super Mute saved to Firestore');
              } catch (error) {
                console.log('Firestore error:', error);
              }
            }
            const newVolume = Math.max(0, (volumeLevel - 20) / 100);
            try {
              await Audio.setVolumeAsync(newVolume);
              console.log('Super Mute: Volume changed to:', newVolume);
            } catch (error) {
              console.log('Volume error:', error);
            }
            const newVolumeLevel = Math.max(0, volumeLevel - 20);
            setVolumeLevel(newVolumeLevel);
            setSuperMuteCount(superMuteCount + 1);
            Alert.alert('Success', 'Volume decreased by 20 per cent.');
          }
        }
      ]
    );
  };

  const startRecording = async () => {
    try {
      if (!permission) {
        await getPermission();
        return;
      }
      const youExists = performers.some(p => p.id === 99);
      if (!youExists) {
        performers.push({ id: 99, name: 'You (Citizen Performer)', boosts: 0, mutes: 0, followers: 0, bio: 'Start performing to build your profile!' });
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      intervalId = setInterval(async () => {
        try {
          if (!recording) return;
          const status = await recording.getStatusAsync();
          let newReading;
          if (status.metering !== undefined && status.metering !== null) {
            const rawMeter = Math.max(-60, Math.min(0, status.metering));
            newReading = Math.floor(((rawMeter + 60) / 60) * 100);
            newReading = Math.max(10, Math.min(100, newReading));
          } else {
            newReading = Math.floor(Math.random() * 30) + 40;
          }
          readings.push(newReading);
          if (readings.length > 15) {
            readings.shift();
          }
          const sum = readings.reduce((a, b) => a + b, 0);
          const baseDb = Math.floor(sum / readings.length);
          const boostEffect = boostCount * 6;
          const muteEffect = muteCount * 6;
          const finalDb = baseDb + boostEffect - muteEffect;
          const clampedDb = Math.max(0, Math.min(120, finalDb));
          setDecibels(clampedDb);
          const you = performers.find(p => p.id === 99);
          if (you) {
            you.boosts = boostCount;
            you.mutes = muteCount;
          }
        } catch (error) {
          console.log('Error:', error);
        }
      }, 300);
    } catch (error) {
      console.log('Failed to start recording:', error);
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (recording) {
      await recording.stopAndUnloadAsync();
      setIsRecording(false);
      setDecibels(0);
      setBoostCount(0);
      setMuteCount(0);
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      readings = [];
    }
  };

  useEffect(() => {
    getPermission();
  }, []);

  const getDbColor = (db) => {
    if (db < 40) return COLORS.mint;
    if (db < 60) return COLORS.persian;
    if (db < 80) return COLORS.violet;
    return COLORS.emergency;
  };

  const getDbLabel = (db) => {
    if (db < 40) return 'Quiet';
    if (db < 60) return 'Moderate';
    if (db < 80) return 'Loud';
    return 'Very Loud!';
  };

  const handleEmergency = () => {
    const newReport = { id: Date.now(), timestamp: Date.now() };
    setEmergencyReports([...emergencyReports, newReport]);
    const recent = emergencyReports.filter(r => Date.now() - r.timestamp < 60000);
    if (recent.length >= 2) {
      Alert.alert(
        'Broadcast Alert',
        'Multiple emergencies reported. Broadcasting to everyone nearby.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Performer Notified',
        'The performer has been alerted to check the area.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Escalate', onPress: () => broadcastEmergency() }
        ]
      );
    }
  };

  const broadcastEmergency = () => {
    Alert.alert(
      'Emergency Broadcast',
      'Emergency alert sent to all nearby citizens.',
      [{ text: 'OK' }]
    );
  };

  const Leaderboard = () => {
    const updatedPerformers = performers.map(p => {
      if (p.id === 99) {
        return { ...p, boosts: boostCount, mutes: muteCount };
      }
      return p;
    });
    const performersWithScore = updatedPerformers.map(p => ({
      ...p,
      netScore: p.boosts - p.mutes,
    }));
    const sorted = [...performersWithScore].sort((a, b) => b.netScore - a.netScore);
    const getRankLabel = (index) => {
      if (index === 0) return '#1';
      if (index === 1) return '#2';
      if (index === 2) return '#3';
      return '#' + (index + 1);
    };
    const getStars = (score) => {
      const starCount = Math.min(5, Math.floor(score / 8) + 1);
      return '★'.repeat(starCount) + '☆'.repeat(5 - starCount);
    };
    return (
      <Layout style={styles.leaderboardContainer}>
        <KText style={styles.leaderboardTitle}>Top Performers</KText>
        <Layout style={styles.leaderboardHeader}>
          <KText style={styles.rankHeader}>#</KText>
          <KText style={styles.nameHeader}>Performer</KText>
          <KText style={styles.scoreHeader}>Score</KText>
        </Layout>
        {sorted.map((performer, index) => (
          <TouchableOpacity
            key={performer.id}
            style={[
              styles.leaderboardRow,
              performer.id === 99 && styles.yourRow,
            ]}
            onPress={() => {
              setSelectedPerformer(performer);
              setShowPerformerProfile(true);
            }}
          >
            <KText style={styles.rankText}>{getRankLabel(index)}</KText>
            <KText style={styles.performerName}>{performer.name}</KText>
            <KText style={styles.starsText}>{getStars(performer.netScore)}</KText>
            <KText style={styles.boostCountText}>
              {performer.netScore > 0 ? '+' : ''}{performer.netScore}
            </KText>
          </TouchableOpacity>
        ))}
        <Layout style={styles.backButtonContainer}>
          <KButton
            title="Back"
            onPress={() => setShowLeaderboard(false)}
            color={COLORS.violet}
          />
        </Layout>
      </Layout>
    );
  };

  const PerformerProfile = ({ performer }) => {
    const profile = performerProfiles[performer.id] || { image: 'default', location: 'Unknown', rating: 0 };
    const netScore = performer.boosts - performer.mutes;
    return (
      <ScrollView style={styles.profileContainer}>
        <Layout style={styles.profileHeader}>
          {profile.image && profile.image.startsWith('http') ? (
            <Image source={{ uri: profile.image }} style={styles.profileImageLarge} />
          ) : (
            <Layout style={styles.profileImagePlaceholder}>
              <KText style={styles.profileImageText}>{performer.name.charAt(0)}</KText>
            </Layout>
          )}
          <KText style={styles.profileName}>{performer.name}</KText>
          <KText style={styles.profileLocation}>Location: {profile.location}</KText>
          <Layout style={styles.profileRating}>
            <KText style={styles.ratingText}>Rating: {profile.rating}</KText>
            <KText style={styles.followerText}>Followers: {performer.followers || 0}</KText>
          </Layout>
        </Layout>
        <Layout style={styles.profileStats}>
          <Layout style={styles.statItem}>
            <KText style={styles.statNumber}>{performer.boosts}</KText>
            <KText style={styles.statLabel}>Boosts</KText>
          </Layout>
          <Layout style={styles.statItem}>
            <KText style={styles.statNumber}>{performer.mutes}</KText>
            <KText style={styles.statLabel}>Mutes</KText>
          </Layout>
          <Layout style={styles.statItem}>
            <KText style={[styles.statNumber, { color: netScore >= 0 ? COLORS.mint : COLORS.emergency }]}>
              {netScore > 0 ? '+' : ''}{netScore}
            </KText>
            <KText style={styles.statLabel}>Net Score</KText>
          </Layout>
        </Layout>
        <Layout style={styles.profileBio}>
          <KText style={styles.bioLabel}>About</KText>
          <KText style={styles.bioText}>{performer.bio || 'No bio yet.'}</KText>
        </Layout>
        <Layout style={styles.profileActions}>
          <TouchableOpacity style={[styles.profileButton, { backgroundColor: COLORS.mint }]}>
            <KText style={styles.profileButtonText}>Follow</KText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.profileButton, { backgroundColor: COLORS.violet }]}
            onPress={() => {
              setShowPerformerProfile(false);
              setSelectedPerformer(null);
            }}
          >
            <KText style={styles.profileButtonText}>Close</KText>
          </TouchableOpacity>
        </Layout>
      </ScrollView>
    );
  };

  const FeedView = () => (
    <Layout style={styles.modeContent}>
      <Layout style={styles.header}>
        <KText style={styles.logoText}>Citizen Sound</KText>
        <KText style={styles.tagline}>Your city. Your sound. Democracy, amplified.</KText>
      </Layout>
      <Layout style={styles.activeUsersContainer}>
        <KText style={styles.activeUsersText}>People active near you: {activeUsers}</KText>
      </Layout>
      <Layout style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewButton, viewMode === 'map' && styles.viewButtonActive]}
          onPress={() => setViewMode('map')}
        >
          <KText style={[styles.viewButtonText, viewMode === 'map' && styles.viewButtonTextActive]}>Map</KText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewButton, viewMode === 'list' && styles.viewButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <KText style={[styles.viewButtonText, viewMode === 'list' && styles.viewButtonTextActive]}>People</KText>
        </TouchableOpacity>
      </Layout>
      {viewMode === 'list' && (
        <ScrollView style={styles.listContainer}>
          {fakeProfiles.map((profile) => (
            <Layout key={profile.id} style={styles.profileCard}>
              <Image source={{ uri: profile.image }} style={styles.profileAvatar} />
              <Layout style={styles.profileInfo}>
                <KText style={styles.profileNameText}>{profile.name}</KText>
                <KText style={styles.profileRoleText}>{profile.role}  {profile.distance}</KText>
                <KText style={styles.profileStatusText}>{profile.status}</KText>
                <KText style={styles.profileVibeText}>"{profile.vibe}"</KText>
              </Layout>
              <Layout style={[styles.signalBadge, 
                { backgroundColor: profile.signal === 'Excellent' ? COLORS.mint : 
                                   profile.signal === 'Strong' ? COLORS.persian : 
                                   profile.signal === 'Good' ? COLORS.violet : COLORS.emergency }
              ]}>
                <KText style={styles.signalText}>{profile.signal}</KText>
              </Layout>
            </Layout>
          ))}
        </ScrollView>
      )}
      {viewMode === 'map' && (
        <Layout style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: 33.8935,
              longitude: -5.5538,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
          >
            {livePerformers.map((performer) => (
              <Marker
                key={performer.id}
                coordinate={performer.coordinates}
                onPress={() => {
                  setSelectedPerformer(performer);
                  setShowPerformerProfile(true);
                }}
              >
                <Layout style={styles.markerContainer}>
                  <Image source={{ uri: performer.image }} style={styles.markerImage} />
                  <Layout style={styles.liveBadge}>
                    <KText style={styles.liveBadgeText}>LIVE</KText>
                  </Layout>
                </Layout>
              </Marker>
            ))}
          </MapView>
        </Layout>
      )}
      {selectedPerformer && !showPerformerProfile && (
        <Layout style={styles.selectedPerformerSection}>
          <KText style={styles.nowPlaying}>Now Supporting: {selectedPerformer.name}</KText>
          <Layout style={styles.selectedPerformerActions}>
            <TouchableOpacity style={[styles.actionButtonSmall, { backgroundColor: COLORS.mint }]} onPress={handleBoost} disabled={!isRecording}>
              <KText style={styles.actionButtonText}>Boost</KText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButtonSmall, { backgroundColor: COLORS.persian }]} onPress={handleMute} disabled={!isRecording}>
              <KText style={styles.actionButtonText}>Mute</KText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButtonSmall, { backgroundColor: COLORS.violet }]} onPress={handleSuperBoost} disabled={!isRecording}>
              <KText style={styles.actionButtonText}>Super Boost</KText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButtonSmall, { backgroundColor: COLORS.emergency }]} onPress={handleSuperMute} disabled={!isRecording}>
              <KText style={styles.actionButtonText}>Super Mute</KText>
            </TouchableOpacity>
          </Layout>
        </Layout>
      )}
      <Layout style={styles.meterContainer}>
        <Layout style={styles.dbCircle}>
          <KText style={styles.dbValue}>{decibels}</KText>
          <KText style={styles.dbUnit}>dB</KText>
        </Layout>
        <KText style={[styles.dbLabel, { color: getDbColor(decibels) }]}>{getDbLabel(decibels)}</KText>
        <Layout style={styles.boostInfo}>
          <KText style={styles.boostText}>Boosts: {boostCount}</KText>
          <KText style={styles.boostText}>Mutes: {muteCount}</KText>
        </Layout>
        <Layout style={styles.meterBar}>
          <Layout style={[styles.meterFill, { width: `${Math.min(decibels / 100 * 100, 100)}%`, backgroundColor: getDbColor(decibels) }]} />
        </Layout>
        <Layout style={styles.meterLabels}>
          <KText style={styles.meterLabel}>0</KText>
          <KText style={styles.meterLabel}>50</KText>
          <KText style={styles.meterLabel}>100</KText>
        </Layout>
      </Layout>
      <TouchableOpacity style={[styles.mainButton, { backgroundColor: isRecording ? COLORS.emergency : COLORS.mint }]} onPress={isRecording ? stopRecording : startRecording}>
        <KText style={styles.mainButtonText}>{isRecording ? 'Stop Listening' : 'Start Listening'}</KText>
      </TouchableOpacity>
      <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergency}>
        <KText style={styles.emergencyText}>EMERGENCY</KText>
      </TouchableOpacity>
      <Layout style={styles.statusContainer}>
        <KText style={styles.statusText}>{isRecording ? 'Recording...' : 'Paused'}</KText>
        {isRecording && <KText style={styles.statusSubtext}>Microphone is active</KText>}
      </Layout>
      <Layout style={styles.leaderboardButtonContainer}>
        <KButton onPress={() => setShowLeaderboard(true)} style={{ backgroundColor: COLORS.violet }}>
          View Leaderboard
        </KButton>
      </Layout>
    </Layout>
  );

  const ProfileView = () => {
    const you = performers.find(p => p.id === 99);
    const netScore = you ? you.boosts - you.mutes : 0;
    return (
      <Layout style={styles.modeContent}>
        <Layout style={styles.header}>
          <KText style={styles.title}>Profile</KText>
          <KText style={styles.tagline}>Citizen Sound</KText>
        </Layout>
        <Layout style={styles.profileCardLarge}>
          <Layout style={styles.profileAvatarLarge}>
            <KText style={styles.profileAvatarText}>You</KText>
          </Layout>
          <KText style={styles.profileNameText}>You (Citizen Performer)</KText>
          <KText style={styles.profileRoleText}>Performer / Citizen</KText>
        </Layout>
        <Layout style={styles.profileStats}>
          <Layout style={styles.statItem}>
            <KText style={styles.statNumber}>{you ? you.boosts : 0}</KText>
            <KText style={styles.statLabel}>Boosts</KText>
          </Layout>
          <Layout style={styles.statItem}>
            <KText style={styles.statNumber}>{you ? you.mutes : 0}</KText>
            <KText style={styles.statLabel}>Mutes</KText>
          </Layout>
          <Layout style={styles.statItem}>
            <KText style={[styles.statNumber, { color: netScore >= 0 ? COLORS.mint : COLORS.emergency }]}>
              {netScore > 0 ? '+' : ''}{netScore}
            </KText>
            <KText style={styles.statLabel}>Net Score</KText>
          </Layout>
        </Layout>
        <Layout style={styles.profileBio}>
          <KText style={styles.bioLabel}>About</KText>
          <KText style={styles.bioText}>Start performing to build your profile and gain followers!</KText>
        </Layout>
        <TouchableOpacity style={[styles.mainButton, { backgroundColor: COLORS.mint }]}>
          <KText style={styles.mainButtonText}>Edit Profile</KText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.mainButton, { backgroundColor: COLORS.violet, marginTop: 8 }]}>
          <KText style={styles.mainButtonText}>Go Live</KText>
        </TouchableOpacity>
      </Layout>
    );
  };

  const MessagesView = () => (
    <Layout style={styles.modeContent}>
      <Layout style={styles.header}>
        <KText style={styles.title}>Messages</KText>
        <KText style={styles.tagline}>Coming soon</KText>
      </Layout>
      <Layout style={styles.emptyState}>
        <KText style={styles.emptyStateText}>No messages yet.</KText>
        <KText style={styles.emptyStateSubtext}>Messages will appear here when you interact with performers.</KText>
      </Layout>
    </Layout>
  );

  const BottomNav = () => (
    <Layout style={styles.bottomNav}>
      <TouchableOpacity style={[styles.navItem, activeTab === 'feed' && styles.navItemActive]} onPress={() => setActiveTab('feed')}>
        <KText style={[styles.navText, activeTab === 'feed' && styles.navTextActive]}>Feed</KText>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.navItem, activeTab === 'profile' && styles.navItemActive]} onPress={() => setActiveTab('profile')}>
        <KText style={[styles.navText, activeTab === 'profile' && styles.navTextActive]}>Profile</KText>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.navItem, activeTab === 'messages' && styles.navItemActive]} onPress={() => setActiveTab('messages')}>
        <KText style={[styles.navText, activeTab === 'messages' && styles.navTextActive]}>Messages</KText>
      </TouchableOpacity>
    </Layout>
  );

  const PerformerView = () => {
    const [localIsLive, setLocalIsLive] = useState(false);
    const goLive = async () => {
      if (localIsLive) {
        setLocalIsLive(false);
        Alert.alert('Session Ended', 'You are no longer live.');
        return;
      }
      setLocalIsLive(true);
      Alert.alert('Go Live', 'You are now live!');
      if (isFirebaseReady && userId) {
        try {
          await addDoc(collection(db, 'sessions'), {
            performerId: '1',
            performerName: 'Medina Guitarist',
            isLive: true,
            boosts: 0,
            mutes: 0,
            startTime: new Date(),
            userId: userId
          });
          console.log('Session saved to Firestore');
        } catch (error) {
          console.log('Session error:', error);
        }
      }
    };
    return (
      <Layout style={styles.modeContent}>
        <Layout style={styles.header}>
          <KText style={styles.title}>Performer Mode</KText>
          <KText style={styles.tagline}>Go live and connect with your audience</KText>
        </Layout>
        <KText style={styles.performerTitle}>Go Live</KText>
        <KText style={styles.performerSubtext}>Connect your device and start performing</KText>
        <Layout style={styles.performerCard}>
          <KText style={styles.performerLabel}>Status</KText>
          <KText style={[styles.performerStatus, { color: localIsLive ? COLORS.mint : COLORS.emergency, fontWeight: 'bold', fontSize: 20 }]}>
            {localIsLive ? 'LIVE NOW' : 'OFFLINE'}
          </KText>
          <TouchableOpacity style={[styles.performerButton, { backgroundColor: localIsLive ? COLORS.emergency : COLORS.mint }]} onPress={goLive}>
            <KText style={styles.performerButtonText}>{localIsLive ? 'End Session' : 'Go Live'}</KText>
          </TouchableOpacity>
        </Layout>
        <Layout style={styles.performerCard}>
          <KText style={styles.performerLabel}>Volume Control</KText>
          <KText style={styles.performerStatus}>{volumeLevel}%</KText>
          <Layout style={styles.volumeBarContainer}>
            <Layout style={[styles.volumeBarFill, { width: `${volumeLevel}%` }]} />
          </Layout>
          <Layout style={styles.volumeActions}>
            <TouchableOpacity 
              style={[styles.volumeButton, { backgroundColor: COLORS.emergency }]}
              onPress={() => setVolumeLevel(Math.max(0, volumeLevel - 10))}
            >
              <KText style={styles.volumeButtonText}>-10</KText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.volumeButton, { backgroundColor: COLORS.mint }]}
              onPress={() => setVolumeLevel(Math.min(100, volumeLevel + 10))}
            >
              <KText style={styles.volumeButtonText}>+10</KText>
            </TouchableOpacity>
          </Layout>
          <KText style={styles.performerSubtext}>Volume changes with Boost/Mute votes</KText>
        </Layout>
        <Layout style={styles.performerCard}>
          <KText style={styles.performerLabel}>Connected Device</KText>
          <KText style={styles.performerStatus}>{isBluetoothConnected ? bluetoothDevice : 'None'}</KText>
          <TouchableOpacity style={[styles.performerButton, { backgroundColor: isBluetoothConnected ? COLORS.emergency : COLORS.violet }]} onPress={() => {
            if (isBluetoothConnected) {
              setIsBluetoothConnected(false);
              setBluetoothDevice(null);
              Alert.alert('Disconnected', 'Bluetooth device disconnected');
            } else {
              setIsBluetoothConnected(true);
              setBluetoothDevice('OP-556');
              Alert.alert('Connected', 'Connected to OP-556');
            }
          }}>
            <KText style={styles.performerButtonText}>{isBluetoothConnected ? 'Disconnect' : 'Connect Bluetooth'}</KText>
          </TouchableOpacity>
        </Layout>
        <Layout style={styles.performerCard}>
          <KText style={styles.performerLabel}>Crowd Response</KText>
          <KText style={styles.performerStat}>Boosts: {boostCount}</KText>
          <KText style={styles.performerStat}>Mutes: {muteCount}</KText>
          <KText style={[styles.performerStat, { color: (boostCount - muteCount) >= 0 ? COLORS.mint : COLORS.emergency, fontWeight: 'bold' }]}>
            Net Score: {boostCount - muteCount > 0 ? '+' : ''}{boostCount - muteCount}
          </KText>
          {localIsLive && <KText style={styles.performerStat}>Listeners: 1</KText>}
        </Layout>
        <Layout style={styles.leaderboardButtonContainer}>
          <KButton onPress={() => setShowLeaderboard(true)} style={{ backgroundColor: COLORS.violet }}>
            View Leaderboard
          </KButton>
        </Layout>
      </Layout>
    );
  };

  // ----- MAIN RENDER -----
  return (
    <ApplicationProvider {...eva} theme={eva.light}>
      <Layout style={styles.container}>
        {showPerformerProfile && selectedPerformer ? (
          <PerformerProfile performer={selectedPerformer} />
        ) : showLeaderboard ? (
          <Leaderboard />
        ) : (
          <Layout style={styles.container}>
            <Layout style={styles.modeToggle}>
              <TouchableOpacity style={[styles.modeButton, mode === 'citizen' && styles.modeButtonActive]} onPress={() => setMode('citizen')}>
                <KText style={[styles.modeText, mode === 'citizen' && styles.modeTextActive]}>Citizen</KText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modeButton, mode === 'performer' && styles.modeButtonActive]} onPress={() => setMode('performer')}>
                <KText style={[styles.modeText, mode === 'performer' && styles.modeTextActive]}>Performer</KText>
              </TouchableOpacity>
            </Layout>
            <Layout style={styles.contentArea}>
              {mode === 'citizen' && (
                <>
                  {activeTab === 'feed' && <FeedView />}
                  {activeTab === 'profile' && <ProfileView />}
                  {activeTab === 'messages' && <MessagesView />}
                </>
              )}
              {mode === 'performer' && <PerformerView />}
            </Layout>
            {mode === 'citizen' && <BottomNav />}
          </Layout>
        )}
      </Layout>
    </ApplicationProvider>
  );
}

// ----- STYLES -----
const styles = StyleSheet.create({
  logoText: { fontSize: 32, fontWeight: 'bold', color: '#66d9a0' },
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'flex-start', padding: 16 },
  header: { marginBottom: 8, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.white },
  tagline: { fontSize: 12, color: COLORS.violetLight, marginTop: 2, fontStyle: 'italic' },
  modeToggle: { flexDirection: 'row', backgroundColor: COLORS.backgroundLight, borderRadius: 20, padding: 4, marginBottom: 8, width: '60%' },
  modeButton: { flex: 1, paddingVertical: 6, borderRadius: 16, alignItems: 'center' },
  modeButtonActive: { backgroundColor: COLORS.violet },
  modeText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  modeTextActive: { color: COLORS.white },
  modeContent: { width: '100%', alignItems: 'center', flex: 1 },
  contentArea: { flex: 1, width: '100%' },
  activeUsersContainer: { backgroundColor: COLORS.backgroundLight, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 8, borderWidth: 1, borderColor: COLORS.mint },
  activeUsersText: { color: COLORS.white, fontSize: 14, fontWeight: 'bold' },
  viewToggle: { flexDirection: 'row', backgroundColor: COLORS.backgroundLight, borderRadius: 20, padding: 4, marginBottom: 8, width: '50%' },
  viewButton: { flex: 1, paddingVertical: 4, borderRadius: 16, alignItems: 'center' },
  viewButtonActive: { backgroundColor: COLORS.violet },
  viewButtonText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  viewButtonTextActive: { color: COLORS.white },
  mapContainer: { width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  map: { width: '100%', height: '100%' },
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  markerImage: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: COLORS.mint },
  liveBadge: { backgroundColor: COLORS.emergency, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, marginTop: -4 },
  liveBadgeText: { color: COLORS.white, fontSize: 8, fontWeight: 'bold' },
  listContainer: { width: '100%', maxHeight: 150, marginBottom: 8 },
  listContent: { paddingBottom: 4 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundLight, padding: 10, borderRadius: 10, marginBottom: 4, borderWidth: 1, borderColor: COLORS.violet },
  profileAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, borderWidth: 1, borderColor: COLORS.mint },
  profileInfo: { flex: 1 },
  profileNameText: { fontSize: 14, fontWeight: 'bold', color: COLORS.white },
  profileRoleText: { fontSize: 11, color: COLORS.textMuted },
  profileStatusText: { fontSize: 12, color: COLORS.mint, fontWeight: '500' },
  profileVibeText: { fontSize: 11, color: COLORS.violetLight, fontStyle: 'italic' },
  signalBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  signalText: { color: COLORS.white, fontSize: 9, fontWeight: 'bold' },
  selectedPerformerSection: { width: '100%', alignItems: 'center', marginBottom: 8, backgroundColor: COLORS.backgroundLight, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.mint },
  nowPlaying: { fontSize: 16, fontWeight: '600', color: COLORS.mint, marginBottom: 6 },
  selectedPerformerActions: { flexDirection: 'row', gap: 10 },
  actionButtonSmall: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  actionButtonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 14 },
  meterContainer: { width: '100%', alignItems: 'center', marginBottom: 8 },
  dbCircle: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 2 },
  dbValue: { fontSize: 48, fontWeight: 'bold', color: COLORS.white },
  dbUnit: { fontSize: 20, color: COLORS.textMuted, marginLeft: 4 },
  dbLabel: { fontSize: 14, marginBottom: 6 },
  boostInfo: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 4 },
  boostText: { fontSize: 12, color: COLORS.text },
  meterBar: { width: '100%', height: 16, backgroundColor: COLORS.backgroundLight, borderRadius: 8, overflow: 'hidden', marginBottom: 2 },
  meterFill: { height: '100%', borderRadius: 8 },
  meterLabels: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 4 },
  meterLabel: { fontSize: 8, color: COLORS.textMuted },
  mainButton: { width: '100%', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 6 },
  mainButtonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 },
  emergencyButton: { backgroundColor: COLORS.emergency, paddingVertical: 10, paddingHorizontal: 30, borderRadius: 10, alignItems: 'center', marginVertical: 4, width: '100%' },
  emergencyText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  statusContainer: { marginTop: 4, alignItems: 'center', marginBottom: 6 },
  statusText: { fontSize: 14, color: COLORS.text },
  statusSubtext: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  leaderboardButtonContainer: { marginTop: 4, width: '100%' },
  performerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white, marginBottom: 2 },
  performerSubtext: { fontSize: 10, color: COLORS.textMuted, marginBottom: 8 },
  performerCard: { backgroundColor: COLORS.backgroundLight, padding: 12, borderRadius: 10, width: '100%', marginBottom: 8, borderWidth: 1, borderColor: COLORS.violet },
  performerLabel: { fontSize: 10, color: COLORS.textMuted, marginBottom: 2 },
  performerStatus: { fontSize: 16, color: COLORS.white, marginBottom: 6 },
  performerStat: { fontSize: 14, color: COLORS.text, marginBottom: 2 },
  performerButton: { paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  performerButtonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 14 },
  volumeBar: { width: '100%', height: 6, backgroundColor: COLORS.background, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  volumeFill: { height: '100%', backgroundColor: COLORS.mint, borderRadius: 4 },
  volumeBarContainer: { width: '100%', height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, overflow: 'hidden', marginVertical: 8 },
  volumeBarFill: { height: '100%', backgroundColor: COLORS.mint, borderRadius: 5 },
  volumeActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8, gap: 8 },
  volumeButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  volumeButtonText: { color: '#1a0e2e', fontWeight: 'bold', fontSize: 14 },
  centerContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 18, color: COLORS.white },
  leaderboardContainer: { flex: 1, padding: 20, paddingTop: 40, backgroundColor: COLORS.background, width: '100%' },
  leaderboardTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.white, textAlign: 'center', marginBottom: 15 },
  leaderboardHeader: { flexDirection: 'row', paddingHorizontal: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.violet, marginBottom: 8 },
  rankHeader: { fontSize: 12, fontWeight: 'bold', color: COLORS.textMuted, width: 30 },
  nameHeader: { fontSize: 12, fontWeight: 'bold', color: COLORS.textMuted, flex: 1 },
  scoreHeader: { fontSize: 12, fontWeight: 'bold', color: COLORS.textMuted, width: 40, textAlign: 'right' },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundLight, padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: COLORS.violet },
  rankText: { fontSize: 14, fontWeight: 'bold', width: 30, color: COLORS.white },
  performerName: { fontSize: 14, flex: 1, color: COLORS.white },
  starsText: { fontSize: 12, marginRight: 8, color: COLORS.violetLight },
  boostCountText: { fontSize: 12, fontWeight: 'bold', width: 35, textAlign: 'right', color: COLORS.mint },
  backButtonContainer: { marginTop: 15 },
  yourRow: { backgroundColor: COLORS.persian, borderWidth: 2, borderColor: COLORS.mint },
  profileContainer: { flex: 1, backgroundColor: COLORS.background, padding: 20, width: '100%' },
  profileHeader: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
  profileImagePlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.violet, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  profileImageText: { fontSize: 40, color: COLORS.white },
  profileImageLarge: { width: 100, height: 100, borderRadius: 50, marginBottom: 10, borderWidth: 2, borderColor: COLORS.mint },
  profileName: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  profileLocation: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  profileRating: { flexDirection: 'row', marginTop: 8, gap: 16 },
  ratingText: { fontSize: 14, color: COLORS.violetLight },
  followerText: { fontSize: 14, color: COLORS.textMuted },
  profileStats: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: COLORS.backgroundLight, padding: 16, borderRadius: 12, marginBottom: 20 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
  statLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  profileBio: { backgroundColor: COLORS.backgroundLight, padding: 16, borderRadius: 12, marginBottom: 20 },
  bioLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.textMuted, marginBottom: 4 },
  bioText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  profileLinks: { flexDirection: 'row', gap: 10, marginBottom: 20, justifyContent: 'center' },
  linkButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  linkButtonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 14 },
  profileActions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  profileButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  profileButtonText: { color: COLORS.background, fontWeight: 'bold', fontSize: 16 },
  profileCardLarge: { backgroundColor: COLORS.backgroundLight, padding: 20, borderRadius: 12, alignItems: 'center', width: '100%', marginBottom: 16, borderWidth: 1, borderColor: COLORS.violet },
  profileAvatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.violet, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  profileAvatarText: { fontSize: 32, color: COLORS.white, fontWeight: 'bold' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyStateText: { fontSize: 18, color: COLORS.white, marginBottom: 8 },
  emptyStateSubtext: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
  bottomNav: { flexDirection: 'row', backgroundColor: COLORS.backgroundLight, borderRadius: 16, padding: 4, marginTop: 8, borderWidth: 1, borderColor: COLORS.violet, width: '100%' },
  navItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  navItemActive: { backgroundColor: COLORS.violet },
  navText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  navTextActive: { color: COLORS.white },
});
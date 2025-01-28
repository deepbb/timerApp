import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const App = () => {
  const [timers, setTimers] = useState([]);
  const [completedTimers, setCompletedTimers] = useState([]);
  const [newTimer, setNewTimer] = useState({ name: '', duration: '', category: '' });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState(null);
  const intervals = useRef({}); // Store intervals for each running timer

  useEffect(() => {
    loadTimers();
    return () => {
      // Clear all intervals on component unmount
      Object.values(intervals.current).forEach(clearInterval);
    };
  }, []);


  useEffect(() => {
    loadTimers();
  }, []);

  const loadTimers = async () => {
    try {
      const savedTimers = await AsyncStorage.getItem('timers');
      const savedCompletedTimers = await AsyncStorage.getItem('completedTimers');
      if (savedTimers) setTimers(JSON.parse(savedTimers));
      if (savedCompletedTimers) setCompletedTimers(JSON.parse(savedCompletedTimers));
    } catch (error) {
      console.error('Failed to load timers:', error);
    }
  };

  const saveTimers = async (updatedTimers, updatedCompletedTimers) => {
    try {
      await AsyncStorage.setItem('timers', JSON.stringify(updatedTimers));
      await AsyncStorage.setItem('completedTimers', JSON.stringify(updatedCompletedTimers));
    } catch (error) {
      console.error('Failed to save timers:', error);
    }
  };

  const addTimer = () => {
    if (!newTimer.name || !newTimer.duration || !newTimer.category) {
      Alert.alert('Please fill in all fields');
      return;
    }
  
    const timer = {
      ...newTimer,
      duration: parseInt(newTimer.duration),
      remaining: parseInt(newTimer.duration),
      status: 'Paused',
    };
  
    const updatedTimers = Array.isArray(timers) ? [...timers, timer] : [timer];
    
    setTimers(updatedTimers); // Correctly updating the timers state
    saveTimers(updatedTimers, completedTimers); // Persisting to storage
    setNewTimer({ name: '', duration: '', category: '' }); // Resetting input
  };
  
  const startTimer = (timer) => {
    if (intervals.current[timer.name]) return; // Avoid multiple intervals
  
    const intervalId = setInterval(() => {
      setTimers((prevTimers) => {
        const updatedTimers = prevTimers.map((t) => {
          if (t.name === timer.name) {
            const newRemaining = t.remaining - 1;
            if (newRemaining <= 0) {
              clearInterval(intervals.current[t.name]);
              delete intervals.current[t.name];
              completeTimer({ ...t, remaining: 0 });
              return { ...t, remaining: 0 }; // Mark as completed
            }
            return { ...t, remaining: Math.max(newRemaining, 0) };
          }
          return t;
        });
        saveTimers(updatedTimers, completedTimers); // Save updated state
        return updatedTimers;
      });
    }, 1000);
  
    intervals.current[timer.name] = intervalId;
  };
  
  const updateTimer = (timer, status, remaining = timer.remaining) => {
    setTimers((prevTimers) => {
      const updatedTimers = prevTimers.map((t) =>
        t.name === timer.name ? { ...t, status, remaining } : t
      );
  
      saveTimers(updatedTimers, completedTimers);
  
      const updatedTimer = updatedTimers.find((t) => t.name === timer.name);
  
      if (status === 'Running') {
        startTimer(updatedTimer); // Use the updated timer object
      } else if (status === 'Paused') {
        stopTimer(updatedTimer);
      }
  
      return updatedTimers;
    });
  };
  

  const stopTimer = (timer) => {
    clearInterval(intervals.current[timer.name]);
    delete intervals.current[timer.name];
  };

  const completeTimer = (timer) => {
    const updatedTimers = timers.filter((t) => t !== timer);
    const updatedCompletedTimers = [...completedTimers, timer];
    setTimers(updatedTimers);
    setCompletedTimers(updatedCompletedTimers);
    saveTimers(updatedTimers, updatedCompletedTimers);
  };

  const TimerItem = ({ timer }) => (
    <View style={styles.timerItem}>
      <Text style={styles.timerName}>{timer.name}</Text>
      <Text style={styles.timerCategory}>{timer.category}</Text>
      <Text style={styles.timerStatus}>{`Status: ${timer.status}`}</Text>
      <Text style={styles.timerRemaining}>{`Remaining: ${timer.remaining}s`}</Text>
      <View style={styles.timerActions}>
        {timer.status === 'Paused' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => updateTimer(timer, 'Running')}
          >
            <Text style={styles.actionText}>Start</Text>
          </TouchableOpacity>
        )}
        {timer.status === 'Running' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => updateTimer(timer, 'Paused')}
          >
            <Text style={styles.actionText}>Pause</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => updateTimer(timer, 'Paused', timer.duration)}
        >
          <Text style={styles.actionText}>Reset</Text>
        </TouchableOpacity>
        {timer.remaining === 0 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => completeTimer(timer)}
          >
            <Text style={styles.actionText}>Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const CompletedTimersScreen = () => (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>Completed Timers</Text>
      <FlatList
        data={completedTimers}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        renderItem={({ item }) => (
          <View style={styles.completedTimerItem}>
            <Text style={styles.completedTimerName}>{item.name}</Text>
            <Text style={styles.completedTimerCategory}>{item.category}</Text>
          </View>
        )}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Timer App</Text>
      <View style={styles.addTimerContainer}>
        <TextInput
          style={styles.input}
          placeholder="Timer Name"
          value={newTimer.name}
          onChangeText={(text) => setNewTimer({ ...newTimer, name: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Duration (seconds)"
          keyboardType="numeric"
          value={newTimer.duration}
          onChangeText={(text) => setNewTimer({ ...newTimer, duration: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Category"
          value={newTimer.category}
          onChangeText={(text) => setNewTimer({ ...newTimer, category: text })}
        />
        <TouchableOpacity style={styles.addButton} onPress={addTimer}>
          <Text style={styles.addButtonText}>Add Timer</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={timers}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        renderItem={({ item }) => <TimerItem timer={item} />}
      />
      <TouchableOpacity
        style={styles.navigationButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.navigationButtonText}>View Completed Timers</Text>
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <CompletedTimersScreen />
        <TouchableOpacity
          style={styles.navigationButton}
          onPress={() => setModalVisible(false)}
        >
          <Text style={styles.navigationButtonText}>Close</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  addTimerContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  timerItem: {
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  timerName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  timerCategory: {
    fontSize: 14,
    color: '#666',
  },
  timerStatus: {
    fontSize: 14,
    color: '#007bff',
  },
  timerRemaining: {
    fontSize: 14,
    color: '#333',
  },
  timerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#007bff',
    padding: 5,
    borderRadius: 5,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
  },
  navigationButton: {
    backgroundColor: '#28a745',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  navigationButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  screenContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  completedTimerItem: {
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  completedTimerName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  completedTimerCategory: {
    fontSize: 14,
    color: '#666',
  },
});

export default App;

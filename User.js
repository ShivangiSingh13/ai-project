const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en'
    },
    temperatureUnit: {
      type: String,
      enum: ['C', 'F'],
      default: 'C'
    }
  },
  devices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device'
  }],
  automationRules: [{
    name: String,
    trigger: {
      type: String,
      enum: ['time', 'temperature', 'motion', 'schedule']
    },
    condition: mongoose.Schema.Types.Mixed,
    action: {
      type: String,
      required: true
    },
    enabled: {
      type: Boolean,
      default: true
    }
  }],
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add methods for user operations
userSchema.methods.addDevice = async function(deviceId) {
  if (!this.devices.includes(deviceId)) {
    this.devices.push(deviceId);
    await this.save();
  }
};

userSchema.methods.removeDevice = async function(deviceId) {
  this.devices = this.devices.filter(id => id.toString() !== deviceId.toString());
  await this.save();
};

userSchema.methods.addAutomationRule = async function(rule) {
  this.automationRules.push(rule);
  await this.save();
};

userSchema.methods.updatePreferences = async function(preferences) {
  this.preferences = { ...this.preferences, ...preferences };
  await this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User; 
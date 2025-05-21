const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['light', 'fan', 'ac', 'thermostat', 'door', 'speaker', 'camera', 'sensor', 'tv', 'refrigerator', 'washer', 'dryer', 'vacuum', 'security', 'blinds']
  },
  status: {
    type: Boolean,
    default: false
  },
  value: {
    type: Number,
    default: 0
  },
  room: {
    type: String,
    required: true
  },
  manufacturer: String,
  model: String,
  ipAddress: String,
  lastMaintenance: Date,
  settings: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  automationRules: [{
    trigger: {
      type: String,
      enum: ['time', 'temperature', 'motion', 'schedule']
    },
    condition: mongoose.Schema.Types.Mixed,
    action: {
      type: String,
      required: true
    }
  }]
}, {
  timestamps: true
});

// Add methods for common device operations
deviceSchema.methods.toggle = async function() {
  this.status = !this.status;
  return await this.save();
};

deviceSchema.methods.setValue = async function(value) {
  this.value = value;
  return await this.save();
};

deviceSchema.methods.addAutomationRule = async function(rule) {
  this.automationRules.push(rule);
  return await this.save();
};

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device; 
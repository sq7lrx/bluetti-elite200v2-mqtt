#!/usr/bin/env python3
"""
Verifies that the encryption keys are correct by testing
a basic connection to the Bluetti device.

Usage: python verify_keys.py [MAC_ADDRESS]
"""

import sys
import json
import asyncio
import os
from pathlib import Path

# Add the parent directory to the path so the modules can be imported
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from bleak import BleakClient, BleakScanner
except ImportError:
    print("❌ Error: bleak is not installed")
    print("   Run: pip install bleak")
    sys.exit(1)

class KeyVerifier:
    """Verifies the encryption keys of the Bluetti device"""
    
    # Standard UUIDs for Bluetti devices
    NOTIFICATION_UUID = "0000ff01-0000-1000-8000-00805f9b34fb"
    WRITE_UUID = "0000ff02-0000-1000-8000-00805f9b34fb"
    
    def __init__(self, mac_address, keys_file="encryption_keys.json"):
        self.mac_address = mac_address
        self.keys_file = keys_file
        self.keys = None
        self.client = None
        
    def load_keys(self):
        """Loads the keys from the JSON file"""
        try:
            if not os.path.exists(self.keys_file):
                print(f"❌ Error: File not found: {self.keys_file}")
                return False
            
            with open(self.keys_file, 'r') as f:
                all_keys = json.load(f)
            
            if self.mac_address not in all_keys:
                print(f"❌ Error: No keys found for device {self.mac_address}")
                print(f"   Available devices: {list(all_keys.keys())}")
                return False
            
            self.keys = all_keys[self.mac_address]
            
            # Validate that it has all the required fields
            required_fields = ['pin', 'key', 'token']
            for field in required_fields:
                if field not in self.keys:
                    print(f"❌ Error: Missing field '{field}' in the keys")
                    return False
            
            print("✅ Keys loaded successfully")
            print(f"   PIN: {self.keys['pin']}")
            print(f"   Key: {self.keys['key'][:8]}...{self.keys['key'][-8:]}")
            print(f"   Token: {self.keys['token'][:16]}...{self.keys['token'][-16:]}")
            
            return True
            
        except json.JSONDecodeError as e:
            print(f"❌ Error: The JSON file is not valid: {e}")
            return False
        except Exception as e:
            print(f"❌ Error loading the keys: {e}")
            return False
    
    async def scan_for_device(self):
        """Scans to find the device"""
        print(f"🔍 Scanning Bluetooth devices...")
        
        try:
            devices = await BleakScanner.discover(timeout=10)
            
            # Look for the device by MAC
            target_device = None
            for device in devices:
                if device.address.upper() == self.mac_address.upper():
                    target_device = device
                    break
            
            if target_device:
                print(f"✅ Device found: {target_device.name or 'Unnamed'} ({target_device.address})")
                return target_device
            else:
                print(f"❌ Device {self.mac_address} not found")
                print("   Devices found:")
                for device in devices:
                    print(f"     {device.address}: {device.name or 'Unnamed'}")
                return None
                
        except Exception as e:
            print(f"❌ Error scanning: {e}")
            return None
    
    async def test_connection(self):
        """Tests the basic connection to the device"""
        print(f"🔗 Testing connection to {self.mac_address}...")
        
        try:
            self.client = BleakClient(self.mac_address)
            await self.client.connect()
            
            print("✅ Bluetooth connection established")
            
            # Discover services
            services = list(self.client.services)
            
            # Verify that the required services exist
            notification_found = False
            write_found = False
            
            for service in services:
                for char in service.characteristics:
                    if char.uuid.lower() == self.NOTIFICATION_UUID.lower():
                        notification_found = True
                    elif char.uuid.lower() == self.WRITE_UUID.lower():
                        write_found = True
            
            if notification_found and write_found:
                print("✅ Bluetti services found")
                return True
            else:
                print("❌ Bluetti services not found")
                print(f"   Notification: {'✅' if notification_found else '❌'}")
                print(f"   Write: {'✅' if write_found else '❌'}")
                return False
                
        except Exception as e:
            print(f"❌ Connection error: {e}")
            return False
    
    async def test_basic_communication(self):
        """Tests basic communication (without full encryption)"""
        print("📡 Testing basic communication...")
        
        try:
            # Set up the notification handler
            received_data = []
            
            def notification_handler(sender, data):
                received_data.append(data)
                print(f"   📨 Received: {data.hex()}")
            
            # Start notifications
            await self.client.start_notify(self.NOTIFICATION_UUID, notification_handler)
            print("✅ Notifications started")
            
            # Wait for the initial messages
            await asyncio.sleep(5)
            
            if received_data:
                print(f"✅ Received {len(received_data)} messages")
                
                # Analyse the messages
                for i, data in enumerate(received_data[:3]):  # Show only the first 3
                    print(f"   Message {i+1}: {data.hex()}")
                    if len(data) >= 2 and data[0] == 0x2A and data[1] == 0x2A:
                        print(f"     -> Encrypted message detected")
            else:
                print("⚠️  No messages received (this may be normal)")
            
            # Stop notifications
            await self.client.stop_notify(self.NOTIFICATION_UUID)
            
            return True
            
        except Exception as e:
            print(f"❌ Communication error: {e}")
            return False
    
    async def disconnect(self):
        """Disconnects from the device"""
        if self.client:
            try:
                await self.client.disconnect()
                print("✅ Disconnected")
            except:
                pass
    
    async def run_verification(self):
        """Runs the full verification"""
        print("🔧 Bluetti key verifier")
        print("=" * 50)
        
        # 1. Load the keys
        if not self.load_keys():
            return False
        
        print()
        
        # 2. Scan for the device
        device = await self.scan_for_device()
        if not device:
            return False
        
        print()
        
        # 3. Test the connection
        if not await self.test_connection():
            return False
        
        print()
        
        # 4. Test basic communication
        success = await self.test_basic_communication()
        
        print()
        
        # 5. Disconnect
        await self.disconnect()
        
        if success:
            print("🎉 Verification completed successfully!")
            print("   The keys appear to be correct.")
            print("   You can proceed to run the MQTT application.")
        else:
            print("⚠️  Partial verification.")
            print("   The connection works but the encryption needs to be verified.")
        
        return success

async def main():
    # Determine the MAC address
    mac_address = None
    
    if len(sys.argv) > 1:
        mac_address = sys.argv[1]
    else:
        # Try to load it from the .env file
        env_file = Path(__file__).parent.parent / ".env"
        if env_file.exists():
            with open(env_file, 'r') as f:
                for line in f:
                    if line.startswith('BLUETTI_MAC='):
                        mac_address = line.split('=', 1)[1].strip()
                        break
    
    if not mac_address:
        print("Usage: python verify_keys.py [MAC_ADDRESS]")
        print()
        print("Or set BLUETTI_MAC in the .env file")
        sys.exit(1)
    
    # Run the verification
    verifier = KeyVerifier(mac_address)
    
    try:
        success = await verifier.run_verification()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⏹️  Verification cancelled by the user")
        await verifier.disconnect()
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        await verifier.disconnect()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())

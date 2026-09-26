#!/usr/bin/env python3
"""
Tests the connection to the Bluetti device without needing any keys.
Useful to verify that the device is reachable over Bluetooth.

Usage: python test_connection.py [MAC_ADDRESS]
"""

import sys
import asyncio
from pathlib import Path

# Add the parent directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from bleak import BleakClient, BleakScanner
except ImportError:
    print("❌ Error: bleak is not installed")
    print("   Run: pip install bleak")
    sys.exit(1)

class ConnectionTester:
    """Tests the basic connection to Bluetti devices"""
    
    def __init__(self, mac_address=None):
        self.mac_address = mac_address
        self.client = None
    
    async def scan_all_devices(self):
        """Scans all available Bluetooth devices"""
        print("🔍 Scanning all Bluetooth devices...")
        
        try:
            devices = await BleakScanner.discover(timeout=15)
            
            if not devices:
                print("❌ No Bluetooth devices found")
                return []
            
            print(f"✅ Found {len(devices)} devices:")
            
            bluetti_devices = []
            
            for device in devices:
                name = device.name or "Unnamed"
                rssi = getattr(device, 'rssi', 'N/A')
                
                # Identify possible Bluetti devices
                is_bluetti = any(keyword in name.lower() for keyword in 
                               ['bluetti', 'elite', 'ac200', 'ac300', 'eb200', 'eb240'])
                
                marker = "🔋" if is_bluetti else "📱"
                print(f"   {marker} {device.address}: {name} (RSSI: {rssi})")
                
                if is_bluetti:
                    bluetti_devices.append(device)
            
            if bluetti_devices:
                print(f"\n🔋 Bluetti devices detected: {len(bluetti_devices)}")
            else:
                print("\n⚠️  No Bluetti devices detected by name")
                print("   Try a specific MAC address if you know the device")
            
            return devices
            
        except Exception as e:
            print(f"❌ Error scanning: {e}")
            return []
    
    async def test_specific_device(self, mac_address):
        """Tests the connection to a specific device"""
        print(f"🔗 Testing connection to {mac_address}...")
        
        try:
            self.client = BleakClient(mac_address)
            
            # Try to connect
            await self.client.connect()
            print("✅ Connection established successfully")
            
            # Get device information
            print(f"   Connected: {self.client.is_connected}")
            
            # Discover services
            print("🔍 Discovering services...")
            services = list(self.client.services)
            
            print(f"✅ Found {len(services)} services:")
            
            bluetti_services = []
            
            for service in services:
                print(f"   📋 Service: {service.uuid}")
                
                for char in service.characteristics:
                    properties = ", ".join(char.properties)
                    print(f"      📄 Characteristic: {char.uuid} ({properties})")
                    
                    # Identify typical Bluetti services
                    if "ff01" in char.uuid or "ff02" in char.uuid:
                        bluetti_services.append(char)
                        print(f"         🔋 Possible Bluetti service detected!")
            
            if bluetti_services:
                print(f"\n🎉 Bluetti device confirmed!")
                print(f"   Bluetti services found: {len(bluetti_services)}")
                
                # Try to read a characteristic (if possible)
                await self.test_basic_read(bluetti_services)
            else:
                print(f"\n⚠️  No typical Bluetti services found")
                print("   It may be a Bluetti device with different UUIDs")
            
            return True
            
        except Exception as e:
            print(f"❌ Connection error: {e}")
            return False
    
    async def test_basic_read(self, bluetti_services):
        """Tries to read basic data (without encryption)"""
        print("📖 Testing basic read...")
        
        for char in bluetti_services[:2]:  # Only try the first 2
            try:
                if "read" in char.properties:
                    data = await self.client.read_gatt_char(char.uuid)
                    print(f"   📨 {char.uuid}: {data.hex()} ({len(data)} bytes)")
                elif "notify" in char.properties:
                    print(f"   🔔 {char.uuid}: Supports notifications")
                    
                    # Briefly listen for notifications
                    received_data = []
                    
                    def handler(sender, data):
                        received_data.append(data)
                        print(f"      📨 Notification: {data.hex()}")
                    
                    await self.client.start_notify(char.uuid, handler)
                    await asyncio.sleep(3)
                    await self.client.stop_notify(char.uuid)
                    
                    if received_data:
                        print(f"      ✅ Received {len(received_data)} notifications")
                    else:
                        print(f"      ⚠️  No notifications received")
                        
            except Exception as e:
                print(f"   ❌ Error reading {char.uuid}: {e}")
    
    async def disconnect(self):
        """Disconnects from the device"""
        if self.client:
            try:
                await self.client.disconnect()
                print("✅ Disconnected")
            except:
                pass
    
    async def run_test(self):
        """Runs the full test"""
        print("🔧 Bluetti connection test")
        print("=" * 50)
        
        try:
            if self.mac_address:
                # Test a specific device
                success = await self.test_specific_device(self.mac_address)
            else:
                # Scan all devices
                devices = await self.scan_all_devices()
                
                # If there are Bluetti devices, try the first one
                bluetti_devices = [d for d in devices if d.name and 
                                 any(keyword in d.name.lower() for keyword in 
                                     ['bluetti', 'elite', 'ac200', 'ac300', 'eb200', 'eb240'])]
                
                if bluetti_devices:
                    print(f"\n🔋 Testing the first Bluetti device: {bluetti_devices[0].address}")
                    success = await self.test_specific_device(bluetti_devices[0].address)
                else:
                    print("\n⚠️  No Bluetti devices found automatically")
                    print("   Specify a MAC address to test a particular device")
                    success = False
            
            return success
            
        finally:
            await self.disconnect()

def load_mac_from_env():
    """Loads the MAC address from the .env file"""
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                if line.startswith('BLUETTI_MAC='):
                    return line.split('=', 1)[1].strip()
    return None

async def main():
    mac_address = None
    
    if len(sys.argv) > 1:
        mac_address = sys.argv[1]
    else:
        # Try to load it from .env
        mac_address = load_mac_from_env()
        if mac_address:
            print(f"📋 Using MAC from .env: {mac_address}")
    
    tester = ConnectionTester(mac_address)
    
    try:
        success = await tester.run_test()
        
        if success:
            print("\n🎉 Test completed successfully!")
            print("   The device is reachable over Bluetooth")
            if mac_address:
                print("   You can proceed to configure the encryption keys")
        else:
            print("\n❌ Test failed")
            print("   Check that:")
            print("   - The device is powered on and nearby")
            print("   - The MAC address is correct")
            print("   - No other applications are connected")
        
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n⏹️  Test cancelled by the user")
        await tester.disconnect()
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        await tester.disconnect()
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in ['-h', '--help']:
        print("Connection test for Bluetti devices")
        print()
        print("Usage:")
        print("  python test_connection.py                    # Scan all devices")
        print("  python test_connection.py XX:XX:XX:XX:XX:XX  # Test a specific device")
        print()
        print("This script does not need encryption keys, it only tests the basic Bluetooth connection.")
        sys.exit(0)
    
    asyncio.run(main())

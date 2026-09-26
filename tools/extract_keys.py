#!/usr/bin/env python3
"""
Extracts encryption keys from captured Bluetooth logs.
Supports Android btsnoop_hci.log files and other formats.

Usage: python extract_keys.py <log_file> [MAC_ADDRESS]
"""

import sys
import struct
import json
from pathlib import Path

class BluetoothLogParser:
    """Parser for Bluetooth logs to extract Bluetti keys"""
    
    def __init__(self, log_file, target_mac=None):
        self.log_file = log_file
        self.target_mac = target_mac.upper() if target_mac else None
        self.extracted_keys = {}
        self.packets = []
    
    def parse_btsnoop_hci(self):
        """Parses an Android btsnoop_hci.log file"""
        print(f"📄 Parsing btsnoop HCI file: {self.log_file}")
        
        try:
            with open(self.log_file, 'rb') as f:
                # Read the btsnoop header
                header = f.read(16)
                if header[:8] != b'btsnoop\x00':
                    print("❌ Error: Not a valid btsnoop file")
                    return False
                
                print("✅ Valid btsnoop file detected")
                
                packet_count = 0
                while True:
                    # Read the packet header
                    packet_header = f.read(24)
                    if len(packet_header) < 24:
                        break
                    
                    # Extract packet information
                    original_length, included_length, flags, drops, timestamp = struct.unpack('>IIIIQ', packet_header)
                    
                    # Read the packet data
                    packet_data = f.read(included_length)
                    if len(packet_data) < included_length:
                        break
                    
                    packet_count += 1
                    
                    # Analyse the packet
                    self.analyze_packet(packet_data, packet_count)
                
                print(f"✅ Processed {packet_count} packets")
                return True
                
        except Exception as e:
            print(f"❌ Error parsing file: {e}")
            return False
    
    def analyze_packet(self, data, packet_num):
        """Analyses an individual packet"""
        if len(data) < 4:
            return
        
        # Look for typical Bluetti patterns
        hex_data = data.hex()
        
        # Pattern 1: Messages starting with 2A2A (Bluetti signature)
        if '2a2a' in hex_data:
            print(f"🔋 Packet {packet_num}: Possible Bluetti message found")
            print(f"   Data: {hex_data}")
            self.extract_from_bluetti_message(data, packet_num)
        
        # Pattern 2: Look for long hexadecimal keys
        self.search_for_keys(hex_data, packet_num)
    
    def extract_from_bluetti_message(self, data, packet_num):
        """Extracts information from Bluetti messages"""
        hex_data = data.hex()
        
        # Look for the 2A2A pattern
        start_pos = hex_data.find('2a2a')
        if start_pos == -1:
            return
        
        # Extract the Bluetti message
        bluetti_msg = hex_data[start_pos:]
        
        if len(bluetti_msg) >= 8:
            # Analyse the opcodes
            opcode1 = bluetti_msg[4:6]
            opcode2 = bluetti_msg[6:8]
            
            print(f"   Opcodes: {opcode1} {opcode2}")
            
            # If it is a long message, it may contain keys
            if len(bluetti_msg) > 32:
                print(f"   Long message detected ({len(bluetti_msg)//2} bytes)")
                
                # Extract possible keys
                payload = bluetti_msg[8:]  # Skip signature and opcodes
                
                if len(payload) >= 32:  # At least 16 bytes for a key
                    possible_key = payload[:32]  # First 16 bytes
                    print(f"   Possible key: {possible_key}")
                    
                    self.extracted_keys[f"packet_{packet_num}_key"] = possible_key
                
                if len(payload) >= 64:  # Possible token
                    possible_token = payload[32:64]
                    print(f"   Possible token: {possible_token}")
                    
                    self.extracted_keys[f"packet_{packet_num}_token"] = possible_token
    
    def search_for_keys(self, hex_data, packet_num):
        """Looks for key patterns in the data"""
        
        # Look for 32-character hexadecimal strings (16 bytes)
        for i in range(0, len(hex_data) - 32, 2):
            candidate = hex_data[i:i+32]
            
            # Check that it is valid hexadecimal
            try:
                int(candidate, 16)
                
                # Avoid overly repetitive patterns
                if len(set(candidate)) > 4:  # At least 5 different characters
                    if f"key_32_{candidate}" not in self.extracted_keys:
                        self.extracted_keys[f"key_32_{candidate}"] = candidate
                        
            except ValueError:
                continue
        
        # Look for hexadecimal strings of 64+ characters
        for i in range(0, len(hex_data) - 64, 2):
            candidate = hex_data[i:i+64]
            
            try:
                int(candidate, 16)
                
                if len(set(candidate)) > 8:  # More diversity for long tokens
                    if f"token_64_{candidate[:16]}" not in self.extracted_keys:
                        self.extracted_keys[f"token_64_{candidate[:16]}"] = candidate
                        
            except ValueError:
                continue
    
    def parse_wireshark_text(self):
        """Parses a text file exported from Wireshark"""
        print(f"📄 Parsing Wireshark text file: {self.log_file}")
        
        try:
            with open(self.log_file, 'r') as f:
                content = f.read()
            
            # Look for lines with hexadecimal data
            lines = content.split('\n')
            packet_num = 0
            
            for line in lines:
                line = line.strip()
                
                # Look for lines that look like hex data
                if any(c in line.lower() for c in '0123456789abcdef'):
                    # Extract only the hexadecimal characters
                    hex_chars = ''.join(c for c in line.lower() if c in '0123456789abcdef')
                    
                    if len(hex_chars) >= 8:
                        packet_num += 1
                        self.analyze_packet(bytes.fromhex(hex_chars), packet_num)
            
            print(f"✅ Processed {packet_num} lines with data")
            return True
            
        except Exception as e:
            print(f"❌ Error parsing text file: {e}")
            return False
    
    def save_extracted_keys(self, output_file="extracted_keys.json"):
        """Saves the extracted keys"""
        if not self.extracted_keys:
            print("⚠️  No keys were extracted")
            return False
        
        # Organise the keys by type
        organized_keys = {
            "possible_keys_32": [],
            "possible_tokens_64": [],
            "bluetti_messages": [],
            "raw_extractions": self.extracted_keys
        }
        
        # Classify the keys
        for key_id, value in self.extracted_keys.items():
            if "key_32" in key_id and len(value) == 32:
                organized_keys["possible_keys_32"].append(value)
            elif "token_64" in key_id and len(value) >= 64:
                organized_keys["possible_tokens_64"].append(value)
            elif "packet_" in key_id:
                organized_keys["bluetti_messages"].append({
                    "id": key_id,
                    "value": value
                })
        
        # Remove duplicates
        organized_keys["possible_keys_32"] = list(set(organized_keys["possible_keys_32"]))
        organized_keys["possible_tokens_64"] = list(set(organized_keys["possible_tokens_64"]))
        
        # Save the file
        with open(output_file, 'w') as f:
            json.dump(organized_keys, f, indent=2)
        
        print(f"✅ Extracted keys saved to {output_file}")
        print(f"   32-char keys: {len(organized_keys['possible_keys_32'])}")
        print(f"   64+ char tokens: {len(organized_keys['possible_tokens_64'])}")
        print(f"   Bluetti messages: {len(organized_keys['bluetti_messages'])}")
        
        # Show the best candidates
        if organized_keys["possible_keys_32"]:
            print("\n🔑 Best key candidates:")
            for i, key in enumerate(organized_keys["possible_keys_32"][:3]):
                print(f"   {i+1}. {key}")
        
        if organized_keys["possible_tokens_64"]:
            print("\n🎫 Best token candidates:")
            for i, token in enumerate(organized_keys["possible_tokens_64"][:3]):
                print(f"   {i+1}. {token[:32]}...{token[-32:]}")
        
        return True
    
    def run_extraction(self):
        """Runs the full extraction"""
        print("🔧 Bluetti key extractor")
        print("=" * 50)
        
        # Determine the file type
        file_path = Path(self.log_file)
        
        if not file_path.exists():
            print(f"❌ Error: File not found: {self.log_file}")
            return False
        
        success = False
        
        # Try different parsers depending on the extension
        if file_path.suffix.lower() in ['.log', '.hci']:
            # Try btsnoop first
            try:
                success = self.parse_btsnoop_hci()
            except:
                # If it fails, try as text
                success = self.parse_wireshark_text()
        else:
            # Text files
            success = self.parse_wireshark_text()
        
        if success:
            return self.save_extracted_keys()
        else:
            return False

def main():
    if len(sys.argv) < 2:
        print("Bluetti encryption key extractor")
        print()
        print("Usage:")
        print("  python extract_keys.py <log_file> [MAC_ADDRESS]")
        print()
        print("Supported files:")
        print("  - btsnoop_hci.log (Android)")
        print("  - Wireshark text exports")
        print("  - Bluetooth capture logs")
        print()
        print("Examples:")
        print("  python extract_keys.py btsnoop_hci.log")
        print("  python extract_keys.py capture.txt E4:B3:23:5B:F5:76")
        sys.exit(1)
    
    log_file = sys.argv[1]
    mac_address = sys.argv[2] if len(sys.argv) > 2 else None
    
    extractor = BluetoothLogParser(log_file, mac_address)
    
    try:
        success = extractor.run_extraction()
        
        if success:
            print("\n🎉 Extraction completed!")
            print("   Check the extracted_keys.json file to see the results")
            print("   Use the candidate keys to create encryption_keys.json")
        else:
            print("\n❌ Extraction failed")
            print("   Check that the file is a valid Bluetooth log")
        
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n⏹️  Extraction cancelled by the user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

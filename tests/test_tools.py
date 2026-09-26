"""
Tests for the project's helper tools
"""

import pytest
import json
import tempfile
import os
from pathlib import Path
import sys

# Add the root directory to the path
sys.path.insert(0, str(Path(__file__).parent.parent))

from tools.convert_license import convert_license_to_json, validate_mac_address


class TestConvertLicense:
    """Tests for the license conversion tool"""
    
    def test_validate_mac_address_valid(self):
        """Test validation of valid MAC addresses"""
        valid_macs = [
            "E4:B3:23:5B:F5:76",
            "00:11:22:33:44:55",
            "FF:FF:FF:FF:FF:FF",
            "aa:bb:cc:dd:ee:ff",
        ]
        
        for mac in valid_macs:
            assert validate_mac_address(mac), f"MAC {mac} should be valid"
    
    def test_validate_mac_address_invalid(self):
        """Test validation of invalid MAC addresses"""
        invalid_macs = [
            "E4:B3:23:5B:F5",  # Too short
            "E4:B3:23:5B:F5:76:77",  # Too long
            "G4:B3:23:5B:F5:76",  # Invalid character
            "E4-B3-23-5B-F5-76",  # Wrong separator
            "",  # Empty
            None,  # None
        ]
        
        for mac in invalid_macs:
            assert not validate_mac_address(mac), f"MAC {mac} should be invalid"
    
    def test_convert_license_to_json_success(self):
        """Test successful conversion of a license to JSON"""
        # Create a temporary license file
        license_content = """
bluetti
1745826744092
4a942a522abf710b3c8e61973e3aa17a
45b31b6c213dfcc16059010bb107746aa4dbb51589e9192e1b37dd0422e7e30d0cc071dcdbd3fd720928d65ee0ef8e1a"""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(license_content)
            license_file = f.name
        
        try:
            # Create a temporary output file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                output_file = f.name
            
            # Convert
            result = convert_license_to_json(
                license_file, 
                "E4:B3:23:5B:F5:76", 
                output_file
            )
            
            assert result, "The conversion should have succeeded"
            
            # Verify the generated JSON file
            with open(output_file, 'r') as f:
                data = json.load(f)
            
            assert "E4:B3:23:5B:F5:76" in data
            device_data = data["E4:B3:23:5B:F5:76"]
            assert device_data["pin"] == "000000"
            assert device_data["key"] == "4a942a522abf710b3c8e61973e3aa17a"
            assert "45b31b6c213dfcc16059010bb107746aa4dbb51589e9192e1b37dd0422e7e30d0cc071dcdbd3fd720928d65ee0ef8e1a" in device_data["token"]
            
        finally:
            # Clean up temporary files
            os.unlink(license_file)
            if os.path.exists(output_file):
                os.unlink(output_file)
    
    def test_convert_license_invalid_format(self):
        """Test conversion with an invalid license format"""
        # Create a file with an incorrect format
        license_content = "invalid_content"
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(license_content)
            license_file = f.name
        
        try:
            result = convert_license_to_json(license_file, "E4:B3:23:5B:F5:76")
            assert not result, "The conversion should have failed with an invalid format"
            
        finally:
            os.unlink(license_file)
    
    def test_convert_license_file_not_found(self):
        """Test conversion with a non-existent file"""
        result = convert_license_to_json("nonexistent_file.csv", "E4:B3:23:5B:F5:76")
        assert not result, "The conversion should have failed with a non-existent file"


class TestUtilities:
    """Tests for general utilities"""
    
    def test_hex_validation(self):
        """Test validation of hexadecimal strings"""
        valid_hex = "4a942a522abf710b3c8e61973e3aa17a"
        invalid_hex = "4a942a522abf710b3c8e61973e3aa17g"  # 'g' is not hex
        
        # Test that it can be converted to base 16 int
        try:
            int(valid_hex, 16)
            valid = True
        except ValueError:
            valid = False
        
        assert valid, "A valid hexadecimal string should convert"
        
        try:
            int(invalid_hex, 16)
            invalid = False
        except ValueError:
            invalid = True
        
        assert invalid, "An invalid hexadecimal string should fail"


if __name__ == "__main__":
    pytest.main([__file__])

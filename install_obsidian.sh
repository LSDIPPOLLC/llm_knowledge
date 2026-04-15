#! /bin/bash
# Works on Ubuntu/Debian systems 

## Get the newest version of Obsidian .deb file
deb_link=$(curl -s https://obsidian.md/download |\
  grep -o "https://github\.com/obsidianmd/obsidian-releases/releases/download/v[0-9]\.[0-9]*\.[0-9]*/obsidian_[0-9]\.[0-9]*\.[0-9]*_amd64\.deb")

if [ -z "$deb_link" ]; then
  echo "Error: Could not find Obsidian download link"
  exit 1
fi

wget "$deb_link"

## Get filename
deb_filename=$(ls | grep -E "obsidian_[0-9]+\.[0-9]+\.[0-9]+_amd64\.deb")

## Install obsidian inside Ubuntu
sudo apt-get install -y ./$deb_filename
#!/bin/bash
# What the WSL kernel knows about virtualization.
echo "cpu flags:"; grep -m1 -o -w -E "svm|vmx|hypervisor|npt|nrip_save" /proc/cpuinfo | sort -u | tr '\n' ' '; echo
echo "kernel: $(uname -r)"
ls -la /dev/kvm 2>&1
lsmod | grep -i kvm
modinfo kvm_amd 2>&1 | head -3
zcat /proc/config.gz 2>/dev/null | grep -E "CONFIG_KVM(_AMD)?=" ; ls /lib/modules/$(uname -r) 2>&1 | head -3
modprobe kvm_amd 2>&1; dmesg 2>/dev/null | grep -i -E "kvm|svm" | tail -5

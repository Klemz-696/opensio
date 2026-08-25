import { Injectable } from '@nestjs/common';

export interface NetworkConfig {
  hostname: string;
  interfaces: {
    name: string;
    ipv4: string;
    netmask: string;
    cidr: number;
    mac: string;
    status: 'UP' | 'DOWN';
  }[];
  routes: {
    destination: string;
    gateway: string;
    interface: string;
  }[];
  dnsServers: string[];
  services: Record<string, { status: 'active' | 'inactive'; description: string }>;
}

@Injectable()
export class SimulatedNetworkService {
  getDefaultConfig(sessionId: string): NetworkConfig {
    const sessionSuffix = sessionId.slice(0, 4);
    return {
      hostname: `opensio-lab-${sessionSuffix}`,
      interfaces: [
        {
          name: 'lo',
          ipv4: '127.0.0.1',
          netmask: '255.0.0.0',
          cidr: 8,
          mac: '00:00:00:00:00:00',
          status: 'UP',
        },
        {
          name: 'eth0',
          ipv4: '192.168.1.50',
          netmask: '255.255.255.0',
          cidr: 24,
          mac: '52:54:00:12:34:56',
          status: 'UP',
        },
      ],
      routes: [
        {
          destination: 'default',
          gateway: '192.168.1.254',
          interface: 'eth0',
        },
        {
          destination: '192.168.1.0/24',
          gateway: '0.0.0.0',
          interface: 'eth0',
        },
      ],
      dnsServers: ['192.168.1.254', '1.1.1.1'],
      services: {
        'isc-dhcp-server': { status: 'active', description: 'ISC DHCP Server' },
        bind9: { status: 'active', description: 'BIND Domain Name Server' },
        ssh: { status: 'active', description: 'OpenBSD Secure Shell server' },
        caddy: { status: 'active', description: 'Caddy Web Server' },
      },
    };
  }

  formatIpAddr(config: NetworkConfig): string {
    let out = '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000\n';
    out += '    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n';
    out += '    inet 127.0.0.1/8 scope host lo\n';
    out += '       valid_lft forever preferred_lft forever\n';

    const eth0 = config.interfaces.find((i) => i.name === 'eth0');
    if (eth0) {
      out += `2: eth0: <BROADCAST,MULTICAST,${eth0.status},LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000\n`;
      out += `    link/ether ${eth0.mac} brd ff:ff:ff:ff:ff:ff\n`;
      out += `    inet ${eth0.ipv4}/${eth0.cidr} brd 192.168.1.255 scope global dynamic eth0\n`;
      out += '       valid_lft 86400sec preferred_lft 86400sec';
    }
    return out;
  }

  formatIpRoute(config: NetworkConfig): string {
    return config.routes
      .map((r) => {
        if (r.destination === 'default') {
          return `default via ${r.gateway} dev ${r.interface} proto dhcp src 192.168.1.50 metric 100`;
        }
        return `${r.destination} dev ${r.interface} proto kernel scope link src 192.168.1.50`;
      })
      .join('\n');
  }

  formatPing(target: string): string {
    const isLocalOrGateway =
      target === '127.0.0.1' ||
      target === 'localhost' ||
      target.startsWith('192.168.1.') ||
      target === '1.1.1.1' ||
      target === '8.8.8.8';

    if (!isLocalOrGateway) {
      return `PING ${target} (${target}) 56(84) bytes of data.\nFrom 192.168.1.254 icmp_seq=1 Destination Host Unreachable\n--- ${target} ping statistics ---\n1 packets transmitted, 0 received, +1 errors, 100% packet loss`;
    }

    return [
      `PING ${target} (${target}) 56(84) bytes of data.`,
      `64 bytes from ${target}: icmp_seq=1 ttl=64 time=0.342 ms`,
      `64 bytes from ${target}: icmp_seq=2 ttl=64 time=0.287 ms`,
      `64 bytes from ${target}: icmp_seq=3 ttl=64 time=0.312 ms`,
      `64 bytes from ${target}: icmp_seq=4 ttl=64 time=0.295 ms`,
      '',
      `--- ${target} ping statistics ---`,
      '4 packets transmitted, 4 received, 0% packet loss, time 3004ms',
      'rtt min/avg/max/mdev = 0.287/0.309/0.342/0.021 ms',
    ].join('\n');
  }

  formatSystemctl(action: string, serviceName: string, config: NetworkConfig): { stdout: string; exitCode: number } {
    const cleanServiceName = serviceName.replace(/\.service$/, '');
    const service = config.services[cleanServiceName];

    if (!service) {
      return {
        stdout: `Unit ${serviceName}.service could not be found.`,
        exitCode: 1,
      };
    }

    if (action === 'status') {
      const activeState = service.status === 'active' ? 'active (running)' : 'inactive (dead)';
      return {
        stdout: [
          `● ${cleanServiceName}.service - ${service.description}`,
          '     Loaded: loaded (/lib/systemd/system/' + cleanServiceName + '.service; enabled; vendor preset: enabled)',
          `     Active: ${activeState} since Mon 2026-08-24 12:00:00 CEST; 3h ago`,
          '   Main PID: 1234 (' + cleanServiceName + ')',
          '      Tasks: 4 (limit: 4915)',
          '     Memory: 18.4M',
          '        CPU: 124ms',
          '     CGroup: /system.slice/' + cleanServiceName + '.service',
        ].join('\n'),
        exitCode: 0,
      };
    }

    return {
      stdout: '',
      exitCode: 0,
    };
  }

  formatListeningPorts(): string {
    return [
      'Netid  State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port  Process',
      'udp    UNCONN  0       0        0.0.0.0:67           0.0.0.0:*          users:(("dhcpd",pid=1234,fd=7))',
      'udp    UNCONN  0       0        0.0.0.0:53           0.0.0.0:*          users:(("named",pid=1235,fd=512))',
      'tcp    LISTEN  0       128      0.0.0.0:22           0.0.0.0:*          users:(("sshd",pid=1236,fd=3))',
      'tcp    LISTEN  0       128      0.0.0.0:53           0.0.0.0:*          users:(("named",pid=1235,fd=20))',
      'tcp    LISTEN  0       512      0.0.0.0:80           0.0.0.0:*          users:(("caddy",pid=1237,fd=4))',
    ].join('\n');
  }
}

import ipaddr from 'ipaddr.js';
import { getSetting } from './db.js';

/**
 * Extract clean client IP from request headers or socket
 */
export function getClientIp(req) {
  let ip = req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.socket?.remoteAddress || 
           '127.0.0.1';

  // If x-forwarded-for contains a list of IPs, take the first one
  if (typeof ip === 'string' && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  // Normalize IPv6 mapped IPv4 like ::ffff:192.168.1.15
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  return ip;
}

/**
 * Checks whether the given client IP matches any of the venue's allowed subnets
 */
export function validateClientNetwork(clientIp, allowedSubnets) {
  if (!allowedSubnets || !Array.isArray(allowedSubnets) || allowedSubnets.length === 0) {
    return { isMatch: true, clientIp, matchedSubnet: 'ALL_ALLOWED' };
  }

  let parsedIp;
  try {
    parsedIp = ipaddr.parse(clientIp);
    if (parsedIp.kind() === 'ipv6' && parsedIp.isIPv4MappedAddress()) {
      parsedIp = parsedIp.toIPv4Address();
    }
  } catch (err) {
    return { isMatch: false, clientIp, error: 'Invalid IP address' };
  }

  for (const subnetStr of allowedSubnets) {
    try {
      if (subnetStr.includes('/')) {
        const cidr = ipaddr.parseCIDR(subnetStr);
        if (parsedIp.kind() === cidr[0].kind() && parsedIp.match(cidr)) {
          return { isMatch: true, clientIp, matchedSubnet: subnetStr };
        }
      } else {
        const exact = ipaddr.parse(subnetStr);
        if (parsedIp.toString() === exact.toString()) {
          return { isMatch: true, clientIp, matchedSubnet: subnetStr };
        }
      }
    } catch {
      // Continue checking other subnets
    }
  }

  return { isMatch: false, clientIp, matchedSubnet: null };
}

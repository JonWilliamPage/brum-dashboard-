/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Dev only, and it has no effect on a production build or on Vercel.
  // Next 16 blocks cross-origin requests to /_next/* dev resources by default,
  // so hitting the dev server from a phone on the LAN (http://<host-ip>:3000)
  // serves the HTML but refuses the JS, CSS, fonts and HMR socket — the page
  // renders as a bare unstyled title. Listing the host here is what makes
  // real-device mobile testing possible. Set DEV_ORIGIN to your machine's LAN
  // IP; the default covers the current test machine.
  allowedDevOrigins: [process.env.DEV_ORIGIN ?? '192.168.8.174'],
};

export default nextConfig;

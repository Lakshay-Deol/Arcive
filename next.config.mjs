/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { webpack }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      "@react-native-async-storage/async-storage": false,
      "@x402/evm/upto/client": false,
      "@x402/evm": false,
    };
    config.externals.push("pino-pretty", "lokijs", "encoding");
    if (webpack) {
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^@x402/,
        })
      );
    }
    return config;
  },
};

export default nextConfig;

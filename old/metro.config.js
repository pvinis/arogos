const { getDefaultConfig } = require("expo/metro-config")
const { withNativeWind } = require("nativewind/metro")

module.exports = (() => {
	let config = getDefaultConfig(__dirname)

	const { transformer, resolver } = config
	config.transformer = {
		...transformer,
		babelTransformerPath: require.resolve("react-native-svg-transformer"),
	}
	config.resolver = {
		...resolver,
		assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
		sourceExts: [...resolver.sourceExts, "svg"],
	}

	config = withNativeWind(config, { input: "./src/global.css" })

	return config
})()

package net.jojoaddison.abofonsa.service;

import java.awt.image.BufferedImage;

/**
 * Minimal BlurHash encoder (the standard algorithm, https://blurha.sh) — produces the inline
 * loading placeholder spec §8.2 stores per asset. Encode-only; decoding happens client-side.
 */
final class BlurHash {

    private static final String ALPHABET =
            "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";

    private BlurHash() {}

    static String encode(BufferedImage image, int componentsX, int componentsY) {
        int width = image.getWidth();
        int height = image.getHeight();
        double[][] factors = new double[componentsX * componentsY][3];

        for (int j = 0; j < componentsY; j++) {
            for (int i = 0; i < componentsX; i++) {
                double normalisation = (i == 0 && j == 0) ? 1 : 2;
                double r = 0;
                double g = 0;
                double b = 0;
                for (int y = 0; y < height; y++) {
                    for (int x = 0; x < width; x++) {
                        double basis =
                                normalisation * Math.cos(Math.PI * i * x / width) * Math.cos(Math.PI * j * y / height);
                        int rgb = image.getRGB(x, y);
                        r += basis * sRGBToLinear((rgb >> 16) & 0xFF);
                        g += basis * sRGBToLinear((rgb >> 8) & 0xFF);
                        b += basis * sRGBToLinear(rgb & 0xFF);
                    }
                }
                double scale = 1.0 / (width * height);
                factors[j * componentsX + i][0] = r * scale;
                factors[j * componentsX + i][1] = g * scale;
                factors[j * componentsX + i][2] = b * scale;
            }
        }

        var hash = new StringBuilder();
        int sizeFlag = (componentsX - 1) + (componentsY - 1) * 9;
        hash.append(encode83(sizeFlag, 1));

        double maximumValue;
        if (factors.length > 1) {
            double actualMax = 0;
            for (int i = 1; i < factors.length; i++) {
                for (int c = 0; c < 3; c++) {
                    actualMax = Math.max(actualMax, Math.abs(factors[i][c]));
                }
            }
            int quantisedMax = (int) Math.max(0, Math.min(82, Math.floor(actualMax * 166 - 0.5)));
            maximumValue = (quantisedMax + 1) / 166.0;
            hash.append(encode83(quantisedMax, 1));
        } else {
            maximumValue = 1;
            hash.append(encode83(0, 1));
        }

        hash.append(encode83(encodeDC(factors[0]), 4));
        for (int i = 1; i < factors.length; i++) {
            hash.append(encode83(encodeAC(factors[i], maximumValue), 2));
        }
        return hash.toString();
    }

    private static int encodeDC(double[] value) {
        return (linearTosRGB(value[0]) << 16) + (linearTosRGB(value[1]) << 8) + linearTosRGB(value[2]);
    }

    private static int encodeAC(double[] value, double maximumValue) {
        int r = quantise(value[0] / maximumValue);
        int g = quantise(value[1] / maximumValue);
        int b = quantise(value[2] / maximumValue);
        return r * 19 * 19 + g * 19 + b;
    }

    private static int quantise(double value) {
        return (int) Math.max(0, Math.min(18, Math.floor(signPow(value) * 9 + 9.5)));
    }

    private static double signPow(double value) {
        return Math.signum(value) * Math.pow(Math.abs(value), 0.5);
    }

    private static double sRGBToLinear(int value) {
        double v = value / 255.0;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }

    private static int linearTosRGB(double value) {
        double v = Math.max(0, Math.min(1, value));
        double srgb = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
        return (int) (srgb * 255 + 0.5);
    }

    private static String encode83(int value, int length) {
        var result = new StringBuilder();
        for (int i = 1; i <= length; i++) {
            int digit = (value / (int) Math.pow(83, length - i)) % 83;
            result.append(ALPHABET.charAt(digit));
        }
        return result.toString();
    }
}

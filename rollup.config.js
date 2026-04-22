import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';
import commonjs from '@rollup/plugin-commonjs';
import {glob} from 'glob';

const inputFiles = glob.sync('./src/*.ts'); // Adjust the pattern as needed
export default {
    input: inputFiles,
    output: {
        dir: 'public/assets/js',
        format: 'esm',
        sourcemap: false,
        preserveModules: true,  // Preserve module structure
        preserveModulesRoot: 'src',  // Keep module structure relative to 'src'
    },
    plugins: [
        copy({
            targets: [
                {src: 'src/**/*.css', dest: 'public/assets/css'},
                {src: 'src/**/*.js', dest: 'public/assets/js'},
            ],
            flatten: false,
            copyOnce: false // Ensure it re-copies on watch
        }),
        typescript({
            tsconfig: './tsconfig.json'
        }),
        nodeResolve(), // This plugin allows Rollup to resolve modules from node_modules
        commonjs() // Converts CommonJS modules to ES modules
    ]
}
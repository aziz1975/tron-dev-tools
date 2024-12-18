"use client";

import React, { useState, useEffect } from 'react';
import {
    getCompilerVersions,
    solidityCompiler,
} from '@agnostico/browser-solidity-compiler';

type BuildType = { version: string; path: string };
type VersionType = { [version: string]: string };

interface AbiInput {
    name?: string;
    type: string;
    internalType?: string;
}

interface AbiItem {
    type: string;
    name?: string;
    inputs?: AbiInput[];
    outputs?: AbiInput[];
    stateMutability?: string;
}

interface SolcVersions {
    releases: VersionType;
    latestRelease: string;
    builds: Record<string, string>[];
}

interface CompiledContract {
    errors: { formattedMessage: string }[];
    sources: Record<string, unknown> | null;
    contracts: {
        Compiled_Contracts?: Record<string, {
            evm: {
                bytecode: {
                    object: string;
                };
            };
            abi: AbiItem[];
        }>;
    } | null;
}

interface OptimizerOptions {
    optimize: boolean;
    runs: number;
}

function SolidityCompiler(): React.JSX.Element {
    const [solcVersions, setSolcVersions] = useState<SolcVersions | null>(null);
    const [compiledContract, setCompiledContract] = useState<CompiledContract>({
        errors: [],
        sources: null,
        contracts: null,
    });
    const [optimizeOption, setOptimizer] = useState<OptimizerOptions>({
        optimize: false,
        runs: 200,
    });
    const [usingVersion, setUsingVersion] = useState<string>('');
    const [content, setContent] = useState<string>('');

    // loads the available versions of solidity compilers from https://binaries.soliditylang.org/bin/list.json
    const loadVersions = async (): Promise<void> => {
        const { releases, latestRelease, builds } = await getCompilerVersions() as {
            releases: VersionType;
            latestRelease: string;
            builds: BuildType[];
        };

        setSolcVersions({
            releases,
            latestRelease,
            builds: builds.map(({ version, path }) => ({ [version]: path })),
        });
        setUsingVersion(releases[latestRelease]);
    };

    useEffect(() => {
        void loadVersions();
    }, []);

    const handleDeployment = async (): Promise<void> => {
        const options: Record<string, unknown> = {};

        if (optimizeOption.optimize) {
            options.optimizer = {
                enabled: optimizeOption.optimize,
                runs: optimizeOption.runs,
            };
        }

        let trimContent = content.trim();

        const contractsAvailable = trimContent.match(/contract/g)?.length ?? 0;

        if (contractsAvailable > 0) {
            const contractNames: string[] = [];

            let index = trimContent.match(/contract/)?.index;

            while (typeof index !== 'undefined') {
                trimContent = trimContent.slice(index + 1);
                const fromContract = trimContent.slice(index);
                const contractSelector = trimContent.slice(
                    trimContent.indexOf(fromContract),
                    fromContract.indexOf('{')
                );
                contractNames.push(contractSelector.trim().split(' ')[1] ?? '');
                index = trimContent.match(/contract/)?.index;
            }

            try {
                const compiled = await solidityCompiler({
                    version: `https://binaries.soliditylang.org/bin/${usingVersion}`,
                    contractBody: content,
                    options,
                }) as CompiledContract;

                console.log(compiled);
                setCompiledContract(compiled);
            } catch (e: unknown) {
                if (e instanceof Error && e.message.includes('failed to load')) {
                    setCompiledContract((prev) => ({
                        ...prev,
                        errors: [
                            {
                                formattedMessage: 'Error: Failed To Load This Compiler\'s versions',
                            },
                        ],
                    }));
                }
            }
        }
    };

    return (
        <main className="flex flex-col items-center p-36 space-y-6 bg-gray-50">
            <h1 className="text-3xl font-semibold text-gray-700 mb-4">Solidity Compiler</h1>
            <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">Contract Code:</h2>
                    <textarea
                        className="w-full h-40 p-4 border rounded-lg text-black focus:ring-2 focus:ring-red-500 focus:outline-none"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Enter your raw contract code here..."
                    />
                </div>

                <div className="mt-6">
                    <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">Settings:</h2>

                        <div className="mb-6">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 text-black focus:ring-red-400 border-gray-300 rounded"
                                    checked={optimizeOption.optimize}
                                    onChange={(e) =>
                                        setOptimizer((prev) => ({
                                            ...prev,
                                            optimize: e.target.checked,
                                        }))
                                    }
                                />
                                <span className="text-gray-700">Enable Optimization</span>
                            </label>

                            {optimizeOption.optimize && (
                                <div className="mt-4">
                                    <label className="block text-gray-600">Enter Number of Runs:</label>
                                    <input
                                        type="number"
                                        className="w-full mt-2 p-2 text-black border rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                                        value={optimizeOption.runs}
                                        onChange={(e) =>
                                            setOptimizer((prev) => ({ ...prev, runs: Number(e.target.value) }))
                                        }
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <p className="mb-2 text-gray-700">Select Solidity Version</p>
                            <label className="flex items-center space-x-2 mb-4">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 text-black focus:ring-red-400 border-gray-300 rounded"
                                    checked
                                    disabled
                                />
                                <span className="text-gray-700">Release Versions Only</span>
                            </label>

                            {solcVersions?.releases && (
                                <select
                                    className="w-full p-2 border rounded-lg text-black focus:ring-2 focus:ring-red-500 focus:outline-none"
                                    name="version"
                                    value={Object.keys(solcVersions.releases).find(
                                        (key) => solcVersions.releases[key] === usingVersion
                                    )}
                                    onChange={(e) => setUsingVersion(solcVersions.releases[e.target.value])}
                                >
                                    {Object.keys(solcVersions.releases).map((option) => (
                                        <option key={option} value={option}>
                                            {option} ({solcVersions.releases[option]})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="text-center">
                        <button
                            className="mt-4 px-6 py-2 w-full text-white bg-red-500 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            onClick={handleDeployment}
                        >
                            Compile
                        </button>
                    </div>

                    <div className="my-8">
                        {compiledContract?.contracts?.Compiled_Contracts && 
                            Object.keys(compiledContract.contracts.Compiled_Contracts).map((cont, index) => {
                                const contractDetails = compiledContract.contracts?.Compiled_Contracts?.[cont];
                                return (
                                    <div key={index}>
                                        <h2 className="text-lg font-semibold text-gray-700">
                                            Compiled Contract ({cont}):
                                        </h2>
                                        <div className="p-4 border-b">
                                            <div className="text-sm text-gray-600 overflow-auto break-all">
                                                <p className="text-lg font-semibold text-gray-700">Bytecode:</p> 
                                                {contractDetails?.evm?.bytecode?.object}
                                            </div>
                                            <div className="mt-4">
                                                <h3 className="text-lg font-semibold text-gray-700">ABI</h3>
                                                <ul className="list-disc pl-6 text-gray-600">
                                                    {contractDetails?.abi.map((item: AbiItem, index: number) => (
                                                        <li key={index} className="mb-4">
                                                            <p>
                                                                <strong>Type:</strong> {item.type}
                                                                {item.name && <>, <strong>Name:</strong> {item.name}</>}
                                                            </p>
                                                            {item.inputs && item.inputs.length > 0 && (
                                                                <div className="ml-4">
                                                                    <p className="text-sm"><strong>Inputs:</strong></p>
                                                                    <ul className="list-disc pl-4">
                                                                        {item.inputs.map((input: AbiInput, i: number) => (
                                                                            <li key={i}>
                                                                                {input.name ? (
                                                                                    <>
                                                                                        <strong>{input.name}</strong> ({input.internalType || "N/A"})
                                                                                    </>
                                                                                ) : (
                                                                                    `Unnamed parameter (${input.internalType || "N/A"})`
                                                                                )}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {item.outputs && item.outputs.length > 0 && (
                                                                <div className="ml-4">
                                                                    <p className="text-sm"><strong>Outputs:</strong></p>
                                                                    <ul className="list-disc pl-4">
                                                                        {item.outputs.map((output: AbiInput, i: number) => (
                                                                            <li key={i}>
                                                                                <strong>{output.type}</strong> ({output.internalType || "N/A"})
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            <p className="text-sm">
                                                                <strong>State Mutability:</strong> {item.stateMutability || "N/A"}
                                                            </p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                    <div className="mt-4">
                        {compiledContract.errors.length > 0 && (
                            <>
                                <h2 className="text-lg font-semibold text-black">Errors</h2>
                                <ul className="list-disc pl-6 text-red-500 p-2 border border-red-300 rounded mt-2">
                                    {compiledContract.errors.map((err) => (
                                        <li key={err.formattedMessage}>{err.formattedMessage}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

export default SolidityCompiler;
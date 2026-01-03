import React from 'react';
import { SignInButton } from "@clerk/clerk-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-900 p-4">
            <div className="max-w-2xl text-center space-y-8">
                <div className="space-y-4">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent">
                        Alchemist AI
                    </h1>
                    <p className="text-xl text-slate-500">
                        Advanced Clinical Documentation & Insight Engine
                    </p>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50">
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        Welcome to the Alchemist platform. Please sign in to access your secure workspace,
                        manage patient records, and utilize our advanced AI analysis tools.
                    </p>

                    <SignInButton mode="modal">
                        <button className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/20 transition-all transform hover:-translate-y-0.5">
                            Sign In to Workspace
                        </button>
                    </SignInButton>
                </div>

                <p className="text-sm text-slate-400">
                    Secure, HIPAA-Compliant, AI-Powered.
                </p>
            </div>
        </div>
    );
}

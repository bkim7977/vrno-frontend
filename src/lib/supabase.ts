import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rrhdrkmomngxcjsatcpy.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_VRNO_API_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 2FA SMS Functions - Simplified for now (no actual SMS until Twilio approved)
export const send2FACode = async (phone: string) => {
  // For now, simulate sending SMS and return a demo code
  // In production, this would integrate with Supabase + Twilio
  console.log(`[DEMO] Would send SMS to ${phone} with code: 123456`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    demoCode: '123456', // For testing purposes
    message: `Verification code sent to ${phone}`
  };
}

export const verify2FACode = async (phone: string, token: string) => {
  // For now, accept demo code "123456" 
  // In production, this would verify through Supabase + Twilio
  console.log(`[DEMO] Verifying code ${token} for ${phone}`);
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (token === '123456') {
    return {
      success: true,
      verified: true,
      message: 'Phone number verified successfully'
    };
  } else {
    throw new Error('Invalid verification code. Use 123456 for demo.');
  }
}

export const signUpWithPhone = async (phone: string, password: string, email: string, username: string) => {
  // First create account with phone + password
  const { data, error } = await supabase.auth.signUp({
    phone: phone,
    password: password,
    options: {
      data: {
        email: email,
        username: username
      }
    }
  })
  
  if (error) {
    throw new Error(error.message)
  }
  
  return data
}

export const signInWithPhone = async (phone: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    phone: phone,
    password: password
  })
  
  if (error) {
    throw new Error(error.message)
  }
  
  return data
}
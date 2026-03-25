import connectDB from '@/lib/db/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function credentialsAuthorize(
  credentials: Partial<Record<"email" | "password", unknown>> | undefined,
  request: any
) {
  try {
    if (!credentials?.email || !credentials?.password) {
      throw new Error('Email and password are required');
    }

    const email = String(credentials.email);
    const password = String(credentials.password);

    await connectDB();

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user has a password (not just Google auth)
    if (!user.password) {
      throw new Error('Please sign in with Google or reset your password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Return user object
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image,
    };
  } catch (error) {
    console.error('Authorization error:', error);
    throw error;
  }
}

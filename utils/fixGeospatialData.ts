import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/userModel';

// Load environment variables
dotenv.config();

const fixGeospatialData = async () => {
  try {
    console.log('Starting geospatial data migration...');

    // Connect to MongoDB
    const mongoUri =
      process.env.MONGO_URI || 'mongodb://localhost:27017/skyEstate';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all users with invalid userAds_address
    const usersWithInvalidGeo = await User.find({
      $or: [
        { userAds_address: { $exists: false } },
        { 'userAds_address.type': { $exists: false } },
        { 'userAds_address.coordinates': { $exists: false } },
        { 'userAds_address.coordinates': { $size: 0 } },
        { 'userAds_address.coordinates': null },
        { 'userAds_address.coordinates.0': { $exists: false } },
        { 'userAds_address.coordinates.1': { $exists: false } },
      ],
    });

    console.log(
      `Found ${usersWithInvalidGeo.length} users with invalid geospatial data`
    );

    // Update each user with default coordinates
    for (const user of usersWithInvalidGeo) {
      await User.findByIdAndUpdate(
        user._id,
        {
          userAds_address: {
            type: 'Point',
            coordinates: [0, 0], // Default coordinates (Null Island)
          },
        },
        { runValidators: false }
      );
      console.log(`Updated user: ${user.username}`);
    }

    console.log('Geospatial data migration completed successfully');
  } catch (error) {
    console.error('Error during geospatial migration:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the migration
fixGeospatialData().catch(console.error);

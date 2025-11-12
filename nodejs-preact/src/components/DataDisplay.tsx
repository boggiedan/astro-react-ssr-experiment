
interface User {
  id: number;
  name: string;
  email: string;
}

interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

interface Comment {
  id: number;
  postId: number;
  name: string;
  email: string;
  body: string;
}

interface DataDisplayProps {
  user: User;
  posts: Post[];
  comments: Comment[];
}

/**
 * Component for displaying data from multiple API calls
 * Tests I/O-bound scenarios
 */
export default function DataDisplay({
  user,
  posts,
  comments,
}: DataDisplayProps) {
  return (
    <div className="w-full">
      <section className="mb-6">
        <h2 className="mb-4 text-2xl font-bold text-gray-800">User Information</h2>
        <div className="rounded-lg bg-blue-50 p-4">
          <h3 className="text-xl font-semibold text-blue-900">{user.name}</h3>
          <p className="text-blue-700">Email: {user.email}</p>
          <p className="text-blue-700">ID: {user.id}</p>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 text-2xl font-bold text-gray-800">Posts ({posts.length})</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {posts.map((post) => (
            <article key={post.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 text-lg font-semibold text-gray-800">{post.title}</h3>
              <p className="text-gray-600">{post.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 text-2xl font-bold text-gray-800">Comments ({comments.length})</h2>
        <div className="space-y-3">
          {comments.slice(0, 10).map((comment) => (
            <div key={comment.id} className="rounded border-l-4 border-purple-500 bg-gray-50 p-3">
              <strong className="text-gray-800">{comment.name}</strong>
              <p className="mt-1 text-gray-600">{comment.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
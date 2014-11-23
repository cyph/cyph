/*
   Source: https://cloud.google.com/appengine/articles/sharding_counters
*/

package sharded_counter

import (
	"fmt"
	"math/rand"

	"appengine"
	"appengine/datastore"
	"appengine/memcache"
)

/*
type counterConfig struct {
	Shards int
}
*/

type shard struct {
	Name  string
	Count int
}

const (
	defaultShards = 100 // 20
	configKind    = "GeneralCounterShardConfig"
	shardKind     = "GeneralCounterShard"
)

func memcacheKey(name string) string {
	return shardKind + ":" + name
}

// Count retrieves the value of the named counter.
func Count(c appengine.Context, name string) (int, error) {
	total := 0
	mkey := memcacheKey(name)
	if _, err := memcache.JSON.Get(c, mkey, &total); err == nil {
		return total, nil
	}
	q := datastore.NewQuery(shardKind).Filter("Name =", name)
	for t := q.Run(c); ; {
		var s shard
		_, err := t.Next(&s)
		if err == datastore.Done {
			break
		}
		if err != nil {
			return total, err
		}
		total += s.Count
	}
	memcache.JSON.Set(c, &memcache.Item{
		Key:        mkey,
		Object:     &total,
		Expiration: 60,
	})
	return total, nil
}

// Increment increments the named counter.
func Increment(c appengine.Context, name string) error {
	/*
		// Get counter config.
		var cfg counterConfig
		ckey := datastore.NewKey(c, configKind, name, 0, nil)
		err := datastore.RunInTransaction(c, func(c appengine.Context) error {
			err := datastore.Get(c, ckey, &cfg)
			if err == datastore.ErrNoSuchEntity {
				cfg.Shards = defaultShards
				_, err = datastore.Put(c, ckey, &cfg)
			}
			return err
		}, nil)
		if err != nil {
			return err
		}
	*/

	var s shard
	err = datastore.RunInTransaction(c, func(c appengine.Context) error {
		shardName := fmt.Sprintf("%s-shard%d", name, rand.Intn( /* cfg.Shards */ defaultShards))
		key := datastore.NewKey(c, shardKind, shardName, 0, nil)
		err := datastore.Get(c, key, &s)
		// A missing entity and a present entity will both work.
		if err != nil && err != datastore.ErrNoSuchEntity {
			return err
		}
		s.Name = name
		s.Count++
		_, err = datastore.Put(c, key, &s)
		return err
	}, nil)
	if err != nil {
		return err
	}
	memcache.IncrementExisting(c, memcacheKey(name), 1)
	return nil
}

/*
// IncreaseShards increases the number of shards for the named counter to n.
// It will never decrease the number of shards.
func IncreaseShards(c appengine.Context, name string, n int) error {
	ckey := datastore.NewKey(c, configKind, name, 0, nil)
	return datastore.RunInTransaction(c, func(c appengine.Context) error {
		var cfg counterConfig
		mod := false
		err := datastore.Get(c, ckey, &cfg)
		if err == datastore.ErrNoSuchEntity {
			cfg.Shards = defaultShards
			mod = true
		} else if err != nil {
			return err
		}
		if cfg.Shards < n {
			cfg.Shards = n
			mod = true
		}
		if mod {
			_, err = datastore.Put(c, ckey, &cfg)
		}
		return err
	}, nil)
}
*/
